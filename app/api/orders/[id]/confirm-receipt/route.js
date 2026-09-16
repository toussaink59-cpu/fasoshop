export const runtime = "nodejs";

import { sameOrigin } from "@/lib/csrf";
import { createNotification } from "@/lib/notifications";
import sql from "@/lib/db";
import { requireBuyer } from "@/lib/authHelpers";
import { sendOrderDeliveredEmail } from "@/lib/email/orders";
import { payoutMode } from "@/lib/payouts";
import { triggerAutoPayoutForLedger } from "@/lib/payout-release";

// POST /api/orders/[id]/confirm-receipt
// L'acheteur confirme la réception d'une sous-commande boutique :
//   - livraison -> delivered (idempotent)
//   - Mobile Money : les fonds passent a "released" puis le reversement
//     est déclenché immédiatement si la plateforme est en mode auto
//   - Espèces (COD) : la ligne passe en "cod_pending" pour traitement
//     administratif (le vendeur a déjà encaissé)
export async function POST(request, { params }) {
  if (!sameOrigin(request)) return Response.json({ error: "Origine non autorisée." }, { status: 403 });
  let user;
  try {
    user = await requireBuyer();
  } catch (e) {
    return Response.json({ error: e.message }, { status: e.status || 401 });
  }

  const { id: orderId } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const shopId = Number(body.shopId);

    if (!Number.isInteger(shopId) || shopId <= 0) {
      return Response.json({ error: "shopId invalide." }, { status: 400 });
    }

    const result = await sql.begin(async (tx) => {
      const [order] = await tx`
        SELECT id, buyer_id, status, payment_method
        FROM orders WHERE id = ${orderId}
      `;

      if (!order) return { error: "Commande introuvable.", status: 404 };
      if (String(order.buyer_id) !== String(user.id) && user.role !== "admin") {
        return { error: "Accès refusé.", status: 403 };
      }
      if (order.status === "cancelled") return { error: "Commande annulée.", status: 400 };

      const [shopInOrder] = await tx`
        SELECT 1 FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = ${orderId} AND p.shop_id = ${shopId}
        LIMIT 1
      `;
      if (!shopInOrder) {
        return { error: "Cette boutique n'appartient pas à cette commande.", status: 403 };
      }

      // Mobile Money : les fonds sont liberables. Espèces : traitement manuel.
      const shouldReleasePayout = order.payment_method === "mobile_money";

      const [updated] = await tx`
        UPDATE shop_commission_ledger
        SET delivery_status = 'delivered',
            payout_status = ${shouldReleasePayout ? "released" : "cod_pending"},
            payout_released_at = ${shouldReleasePayout ? new Date() : null}
        WHERE order_id = ${orderId}
          AND shop_id = ${shopId}
          AND delivery_status = 'shipped'
          AND payout_status = 'held'
        RETURNING id, delivery_status, payout_status
      `;

      // Idempotence : une confirmation deja enregistrée reussit en silence.
      if (!updated) {
        const [ledger] = await tx`
          SELECT delivery_status, payout_status FROM shop_commission_ledger
          WHERE order_id = ${orderId} AND shop_id = ${shopId}
        `;
        if (!ledger) return { error: "Sous-commande introuvable.", status: 404 };
        if (ledger.delivery_status === "delivered") {
          return { ok: true, alreadyProcessed: true, ledger };
        }
        if (ledger.delivery_status === "preparation") {
          return { error: "Le vendeur n'a pas encore expédié la commande.", status: 400 };
        }
        return { error: `État actuel : ${ledger.delivery_status}/${ledger.payout_status}. Confirmation impossible.`, status: 409 };
      }

      const subs = await tx`
        SELECT delivery_status FROM shop_commission_ledger WHERE order_id = ${orderId}
      `;
      const allDelivered = subs.every((s) => s.delivery_status === "delivered");
      if (allDelivered) {
        await tx`UPDATE orders SET status = 'delivered' WHERE id = ${orderId}`;
      }

      await tx`
        INSERT INTO order_status_history
          (order_id, shop_id, from_status, to_status, actor_id, actor_role, reason)
        VALUES (${orderId}, ${shopId}, 'shipped', 'delivered', ${user.id}, ${user.role}, 'client_confirm_receipt')
      `;

      await tx`
        INSERT INTO security_audit_log (user_id, action, resource_type, resource_id, ip_address)
        VALUES (${user.id}, 'confirm_receipt', 'order', ${orderId},
                ${request.headers.get("x-forwarded-for") || "unknown"})
      `.catch(() => {});

      return { ok: true, ledger: updated, payoutReleased: shouldReleasePayout, buyerId: order.buyer_id };
    });

    if (result.error) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    // ----- Après commit : effets secondaires, jamais dans la transaction -----

    let payoutResult = null;

    // 1) Reversement automatique (Mobile Money, mode auto de la plateforme).
    //    La confirmation de livraison ne doit pas échouer si le fournisseur
    //    de paiement ralentit : tout écart est repris par le cron.
    if (result.payoutReleased && payoutMode() === "auto" && result.ledger?.id) {
      try {
        payoutResult = await triggerAutoPayoutForLedger(result.ledger.id);
      } catch (err) {
        console.error("[confirm-receipt] reversement automatique :", err.message);
        payoutResult = { status: "error" };
      }
    }

    // 2) E-mail de livraison (non bloquant).
    try {
      const [buyer] = await sql`
        SELECT u.email, u.full_name FROM users u WHERE u.id = ${result.buyerId} LIMIT 1
      `;
      const [shopRow] = await sql`SELECT name FROM shops WHERE id = ${shopId} LIMIT 1`;
      if (buyer) {
        sendOrderDeliveredEmail({
          to: buyer.email,
          firstName: (buyer.full_name || "").split(" ")[0] || "Client",
          orderId: Number(orderId),
          shopName: shopRow?.name || "Boutique",
          autoConfirmed: false,
        }).catch(() => {});
      }
    } catch (err) {
      console.error("[confirm-receipt] e-mail :", err.message);
    }

    // 3) Notification vendeur.
    try {
      const [vendorUser] = await sql`
        SELECT u.id FROM users u JOIN shops s ON s.vendor_id = u.id WHERE s.id = ${shopId} LIMIT 1
      `;
      if (vendorUser) {
        const paidNow = payoutResult?.status === "paid";
        await createNotification({
          userId: vendorUser.id,
          type: "order_delivered",
          title: `Livraison confirmée #${orderId}`,
          body: paidNow
            ? "Le client a confirmé la réception — reversement envoyé sur votre Mobile Money"
            : result.payoutReleased
            ? "Le client a confirmé la réception — reversement en cours de traitement"
            : "Le client a confirmé la réception (paiement à la livraison)",
          link: "/vendor/orders",
          data: { orderId: Number(orderId), shopId: Number(shopId) },
        });
      }
    } catch (err) {
      console.error("[confirm-receipt] notification :", err.message);
    }

    return Response.json({
      ok: true,
      alreadyProcessed: !!result.alreadyProcessed,
      payoutReleased: !!result.payoutReleased,
      payoutAuto: payoutResult,
    });
  } catch (err) {
    console.error("[confirm-receipt] Erreur :", err);
    return Response.json({ error: "Erreur serveur." }, { status: 500 });
  }
}