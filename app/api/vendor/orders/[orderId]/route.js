import sql from "@/lib/db";

// PATCH /api/vendor/orders/:orderId
// Le vendeur met à jour le statut de livraison de SA sous-commande uniquement
// (shop_commission_ledger), sans affecter les autres boutiques de la même commande.
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

    // Retrouve la boutique du vendeur connecté
    const [shop] = await sql`
      SELECT id FROM shops WHERE vendor_id = ${userId} LIMIT 1
    `;
    if (!shop) {
      return Response.json({ error: "Aucune boutique associée à ce compte." }, { status: 404 });
    }

    // Met à jour uniquement la ligne de sous-commande correspondant à CETTE boutique et CETTE commande
    const [updated] = await sql`
      UPDATE shop_commission_ledger
      SET delivery_status = ${status}
      WHERE order_id = ${orderId} AND shop_id = ${shop.id}
      RETURNING id, order_id, shop_id, delivery_status
    `;

    if (!updated) {
      return Response.json(
        { error: "Cette commande ne concerne pas votre boutique." },
        { status: 403 }
      );
    }

    // Si toutes les sous-commandes d'une commande sont livrées, on peut faire
    // passer le statut global de la commande à "delivered" pour cohérence.
    const subOrders = await sql`
      SELECT delivery_status FROM shop_commission_ledger WHERE order_id = ${orderId}
    `;
    const allDelivered = subOrders.every((s) => s.delivery_status === "delivered");
    const anyShipped = subOrders.some((s) => s.delivery_status === "shipped" || s.delivery_status === "delivered");

    if (allDelivered) {
      await sql`UPDATE orders SET status = 'delivered' WHERE id = ${orderId}`;
    } else if (anyShipped) {
      await sql`UPDATE orders SET status = 'shipped' WHERE id = ${orderId} AND status = 'pending'`;
    }

    return Response.json({ subOrder: updated });
  } catch (err) {
    console.error("Erreur mise à jour sous-commande:", err);
    return Response.json(
      { error: "Erreur serveur lors de la mise à jour de la commande." },
      { status: 500 }
    );
  }
}
