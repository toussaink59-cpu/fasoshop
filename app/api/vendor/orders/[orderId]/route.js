import { sameOrigin } from "@/lib/csrf";
import { createNotification } from "@/lib/notifications";
import sql from "@/lib/db";
import { requireVendor } from "@/lib/authHelpers";
import { sendOrderShippedEmail } from "@/lib/email/orders";

// PATCH /api/vendor/orders/:orderId
// VENDEUR : peut passer preparation → shipped, ou preparation → cancelled.
// P0 CRITIQUE : delivered INTERDIT au vendeur (c'est le rôle du client).
// P0 CRITIQUE : cancel après shipped INTERDIT (colis déjà en route).
export async function PATCH(request, { params }) {
  if (!sameOrigin(request)) return Response.json({ error: "Origine non autorisée." }, { status: 403 });
  let user;
  try {
    user = await requireVendor();
  } catch (e) {
    return Response.json({ error: e.message }, { status: e.status || 401 });
  }

  const { orderId } = await params;

  try {
    const { status, reason } = await request.json();

 // P0 : seuls shipped (et cancel si préparation) autorisés
    const allowed = ["shipped", "cancelled"];
    if (!allowed.includes(status)) {
      return Response.json(
        { error: `Statut invalide. Autorisés : ${allowed.join(", ")}. (delivered est réservé au client)` },
        { status: 400 }
      );
    }

    const result = await sql.begin(async (tx) => {
      // 1) Boutique du vendeur
      const [shop] = await tx`
        SELECT id FROM shops WHERE vendor_id = ${user.id} LIMIT 1
      `;
      if (!shop) {
        return { error: "Aucune boutique associée à ce compte.", status: 404 };
      }

      // 2) Commande existe et non annulée
      const [order] = await tx`
        SELECT id, status FROM orders WHERE id = ${orderId}
      `;
      if (!order) return { error: "Commande introuvable.", status: 404 };
      if (order.status === "cancelled") return { error: "Commande annulée.", status: 400 };

      // 3) État actuel sous-commande
      const [current] = await tx`
        SELECT delivery_status, payout_status FROM shop_commission_ledger
        WHERE order_id = ${orderId} AND shop_id = ${shop.id}
      `;
      if (!current) {
        return { error: "Cette commande ne concerne pas votre boutique.", status: 403 };
      }

 // 4) Machine à états STRICTE (P0)
      //    preparation → shipped OK
      //    preparation → cancelled OK (avec restock à faire)
      //    shipped → rien (seul le client peut confirmer delivered)
      //    delivered/cancelled → rien
      const transitions = {
        preparation: ["shipped", "cancelled"],
        shipped: [],              // verrouillé : client-only
        delivered: [],
        cancelled: [],
      };

      const allowedT = transitions[current.delivery_status] || [];
      if (!allowedT.includes(status)) {
        return {
          error: `Transition refusée : ${current.delivery_status} → ${status}. Autorisé depuis cet état : ${allowedT.join(", ") || "aucune action"}.`,
          status: 400,
        };
      }

      // 5) Update sous-commande (idempotent via RETURNING)
      const [updated] = await tx`
        UPDATE shop_commission_ledger
        SET delivery_status = ${status}
        WHERE order_id = ${orderId} AND shop_id = ${shop.id}
          AND delivery_status = ${current.delivery_status}
        RETURNING id, order_id, shop_id, delivery_status
      `;

      if (!updated) {
        return { error: "État déjà modifié, rechargez la page.", status: 409 };
      }

 // 6) Si annulation depuis preparation → RESTOCK automatique
      if (status === "cancelled" && current.delivery_status === "preparation") {
        const items = await tx`
          SELECT oi.product_id, oi.quantity
          FROM order_items oi
          JOIN products p ON p.id = oi.product_id
          WHERE oi.order_id = ${orderId} AND p.shop_id = ${shop.id}
        `;

        for (const it of items) {
          await tx`
            UPDATE products
            SET stock_quantity = stock_quantity + ${it.quantity}
            WHERE id = ${it.product_id}
          `;
        }

        // Commission = 0 pour cette sous-commande annulée
        await tx`
          UPDATE shop_commission_ledger
          SET commission_amount = 0, payout_amount = 0, status = 'voided'
          WHERE order_id = ${orderId} AND shop_id = ${shop.id}
        `;
      }

      // 7) Statut global commande (agrégat)
      const subOrders = await tx`
        SELECT delivery_status FROM shop_commission_ledger WHERE order_id = ${orderId}
      `;

      const allDelivered = subOrders.every((s) => s.delivery_status === "delivered");
      const anyShipped = subOrders.some((s) =>
        s.delivery_status === "shipped" || s.delivery_status === "delivered"
      );
      const allCancelled = subOrders.every((s) => s.delivery_status === "cancelled");

      if (allDelivered) {
        await tx`UPDATE orders SET status = 'delivered' WHERE id = ${orderId}`;
      } else if (allCancelled) {
        await tx`UPDATE orders SET status = 'cancelled' WHERE id = ${orderId}`;
      } else if (anyShipped && order.status === "paid") {
        await tx`UPDATE orders SET status = 'shipped' WHERE id = ${orderId}`;
      }

      // 8) Historique (P0 audit trail)
      await tx`
        INSERT INTO order_status_history
          (order_id, shop_id, from_status, to_status, actor_id, actor_role, reason)
        VALUES (${orderId}, ${shop.id}, ${current.delivery_status}, ${status},
                ${user.id}, ${user.role}, ${reason || null})
      `;

      // 9) Audit log
      await tx`
        INSERT INTO security_audit_log (user_id, action, resource_type, resource_id, ip_address)
        VALUES (${user.id}, 'update_delivery_status', 'order', ${orderId},
                ${request.headers.get("x-forwarded-for") || "unknown"})
      `.catch(() => {});

 // EMAIL EXPEDITION (fire-and-forget, non-bloquant)
      if (status === "shipped") {
        try {
          const [buyer] = await tx`
            SELECT u.email, u.full_name FROM users u
            JOIN orders o ON o.buyer_id = u.id WHERE o.id = ${orderId} LIMIT 1
          `;
          const [shopRow] = await tx`SELECT name FROM shops WHERE id = ${shop.id} LIMIT 1`;
          if (buyer) {
            sendOrderShippedEmail({
              to: buyer.email,
              firstName: (buyer.full_name || "").split(" ")[0] || "Client",
              orderId: Number(orderId),
              shopName: shopRow?.name || "Boutique",
            }).catch(() => {});
          }
        } catch (emailErr) {
          console.error("[vendor/orders] email error:", emailErr.message);
        }
      }

        // NOTIF: shipped_or_delivered - notifier le client
        if (status === "shipped" || status === "delivered") {
          try {
            const [buyer] = await sql`SELECT id FROM users u JOIN orders o ON o.buyer_id = u.id WHERE o.id = ${orderId} LIMIT 1`;
            if (buyer) {
              const [shopName] = await sql`SELECT name FROM shops WHERE id = ${shop.id} LIMIT 1`;
              await createNotification({
                userId: buyer.id,
                type: status === "shipped" ? 'order_shipped' : 'order_delivered',
                title: status === "shipped" ? 'Commande #' + orderId + ' expédiée' : 'Commande #' + orderId + ' livrée',
                body: status === "shipped"
                  ? 'Votre commande de ' + (shopName?.name || 'la boutique') + ' est en route'
                  : 'Votre commande a été livrée — confirmez la réception pour libérer le paiement',
                link: '/orders',
                data: { orderId: Number(orderId), status },
              });
            }
          } catch (notifErr) {
            console.error('[notif] shipped/delivered error:', notifErr.message);
          }
        }

        return { ok: true, subOrder: updated, restocked: status === "cancelled" && current.delivery_status === "preparation" };
    });

    if (result.error) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json(result);
  } catch (err) {
    console.error("[vendor/orders/PATCH] Erreur:", err);
    return Response.json({ error: "Erreur serveur." }, { status: 500 });
  }
}