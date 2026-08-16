import sql from "@/lib/db";
import { requireBuyer } from "@/lib/authHelpers";

// POST /api/orders/[id]/confirm-receipt
// CLIENT confirme réception → delivered + payout libéré (si MM)
// P0 : idempotent, atomique, historisé, distingue MM/COD
export async function POST(request, { params }) {
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
      // 1) Commande + méthode paiement
      const [order] = await tx`
        SELECT id, buyer_id, status, payment_method
        FROM orders WHERE id = ${orderId}
      `;

      if (!order) {
        return { error: "Commande introuvable.", status: 404 };
      }

      if (String(order.buyer_id) !== String(user.id) && user.role !== "admin") {
        return { error: "Accès refusé.", status: 403 };
      }

      if (order.status === "cancelled") {
        return { error: "Commande annulée.", status: 400 };
      }

      // 2) shopId appartient bien à cette commande
      const [shopInOrder] = await tx`
        SELECT 1 FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = ${orderId} AND p.shop_id = ${shopId}
        LIMIT 1
      `;

      if (!shopInOrder) {
        return { error: "Cette boutique n'appartient pas à cette commande.", status: 403 };
      }

      // 3) Machine à états + idempotence stricte
      // 🆕 Distinction MM/COD : payout libéré SEULEMENT si mobile_money
      const shouldReleasePayout = order.payment_method === "mobile_money";
      const targetPayoutStatus = shouldReleasePayout ? "released" : "cod_pending";

      const [updated] = await tx`
        UPDATE shop_commission_ledger
        SET delivery_status = 'delivered',
            payout_status = ${targetPayoutStatus},
            payout_released_at = NOW()
        WHERE order_id = ${orderId}
          AND shop_id = ${shopId}
          AND delivery_status = 'shipped'
          AND payout_status = 'held'
        RETURNING id, delivery_status, payout_status
      `;

      // IDEMPOTENCE : si déjà livré = OK silencieux
      if (!updated) {
        const [ledger] = await tx`
          SELECT delivery_status, payout_status FROM shop_commission_ledger
          WHERE order_id = ${orderId} AND shop_id = ${shopId}
        `;

        if (!ledger) {
          return { error: "Sous-commande introuvable.", status: 404 };
        }

        if (ledger.delivery_status === "delivered") {
          return { ok: true, alreadyProcessed: true, ledger };
        }
        if (ledger.delivery_status === "preparation") {
          return { error: "Le vendeur n'a pas encore expédié la commande.", status: 400 };
        }
        return { error: `État actuel : ${ledger.delivery_status}/${ledger.payout_status}. Confirmation impossible.`, status: 409 };
      }

      // 4) Statut global commande (agrégat des sous-commandes)
      const subs = await tx`
        SELECT delivery_status FROM shop_commission_ledger WHERE order_id = ${orderId}
      `;
      const allDelivered = subs.every((s) => s.delivery_status === "delivered");
      if (allDelivered) {
        await tx`UPDATE orders SET status = 'delivered' WHERE id = ${orderId}`;
      }

      // 5) Historique (P0 audit trail)
      await tx`
        INSERT INTO order_status_history
          (order_id, shop_id, from_status, to_status, actor_id, actor_role, reason)
        VALUES (${orderId}, ${shopId}, 'shipped', 'delivered', ${user.id}, ${user.role}, 'client_confirm_receipt')
      `;

      // 6) Audit log
      await tx`
        INSERT INTO security_audit_log (user_id, action, resource_type, resource_id, ip_address)
        VALUES (${user.id}, 'confirm_receipt', 'order', ${orderId},
                ${request.headers.get("x-forwarded-for") || "unknown"})
      `.catch(() => {});

      return { ok: true, ledger: updated, payoutReleased: shouldReleasePayout };
    });

    if (result.error) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json(result);
  } catch (err) {
    console.error("[confirm-receipt] Erreur:", err);
    return Response.json({ error: "Erreur serveur." }, { status: 500 });
  }
}