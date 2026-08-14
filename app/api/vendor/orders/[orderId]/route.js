import sql from "@/lib/db";

// PATCH /api/vendor/orders/:orderId
// Le vendeur met à jour le statut de livraison de SA sous-commande uniquement.
// CORRIGÉ P0 : machine à états stricte, transaction atomique, audit log.
// body: { status } -> 'shipped' | 'delivered' | 'cancelled'
export async function PATCH(request, { params }) {
  const userId = request.headers.get("x-user-id");
  const { orderId } = await params;

  try {
    const { status } = await request.json();
    const allowed = ["shipped", "delivered", "cancelled"];
    if (!allowed.includes(status)) {
      return Response.json(
        { error: "Statut invalide. Valeurs autorisées : shipped, delivered, cancelled." },
        { status: 400 }
      );
    }

    const result = await sql.begin(async (tx) => {
      // 1) Retrouve la boutique du vendeur connecté
      const [shop] = await tx`
        SELECT id FROM shops WHERE vendor_id = ${userId} LIMIT 1
      `;
      if (!shop) {
        return { error: "Aucune boutique associée à ce compte.", status: 404 };
      }

      // 2) Vérifie que la commande existe et n'est pas annulée
      const [order] = await tx`
        SELECT id, status FROM orders WHERE id = ${orderId}
      `;
      if (!order) {
        return { error: "Commande introuvable.", status: 404 };
      }
      if (order.status === "cancelled") {
        return { error: "Commande annulée, modification impossible.", status: 400 };
      }

      // 3) Récupère l'état actuel de la sous-commande
      const [current] = await tx`
        SELECT delivery_status, payout_status FROM shop_commission_ledger
        WHERE order_id = ${orderId} AND shop_id = ${shop.id}
      `;
      if (!current) {
        return { error: "Cette commande ne concerne pas votre boutique.", status: 403 };
      }

      // 4) Machine à états stricte
      const transitions = {
        preparation: ["shipped", "cancelled"],
        shipped: ["delivered", "cancelled"],
        delivered: [],
        cancelled: [],
      };

      const allowedTransitions = transitions[current.delivery_status] || [];
      if (!allowedTransitions.includes(status)) {
        return {
          error: `Transition invalide : ${current.delivery_status} → ${status}. Transitions autorisées : ${allowedTransitions.join(", ") || "aucune"}`,
          status: 400,
        };
      }

      // 5) Mise à jour de la sous-commande
      const [updated] = await tx`
        UPDATE shop_commission_ledger
        SET delivery_status = ${status}
        WHERE order_id = ${orderId} AND shop_id = ${shop.id}
        RETURNING id, order_id, shop_id, delivery_status
      `;

      // 6) Mise à jour du statut global de la commande
      const subOrders = await tx`
        SELECT delivery_status FROM shop_commission_ledger WHERE order_id = ${orderId}
      `;

      const allDelivered = subOrders.every((s) => s.delivery_status === "delivered");
      const anyShipped = subOrders.some(
        (s) => s.delivery_status === "shipped" || s.delivery_status === "delivered"
      );
      const allCancelled = subOrders.every((s) => s.delivery_status === "cancelled");

      if (allDelivered) {
        await tx`UPDATE orders SET status = 'delivered' WHERE id = ${orderId}`;
      } else if (allCancelled) {
        await tx`UPDATE orders SET status = 'cancelled' WHERE id = ${orderId}`;
      } else if (anyShipped && order.status === "paid") {
        await tx`UPDATE orders SET status = 'shipped' WHERE id = ${orderId}`;
      }

      // 7) Audit log
      await tx`
        INSERT INTO security_audit_log (user_id, action, resource_type, resource_id, ip_address)
        VALUES (${userId}, 'update_delivery_status', 'order', ${orderId}, ${request.headers.get("x-forwarded-for") || "unknown"})
      `.catch(() => {});

      return { ok: true, subOrder: updated };
    });

    if (result.error) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json(result);
  } catch (err) {
    console.error("Erreur mise à jour sous-commande:", err);
    return Response.json(
      { error: "Erreur serveur lors de la mise à jour de la commande." },
      { status: 500 }
    );
  }
}