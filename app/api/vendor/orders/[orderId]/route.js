import sql from "@/lib/db";

// PATCH /api/vendor/orders/:orderId
// Le vendeur met à jour le statut d'une commande contenant l'un de ses produits.
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

    // Vérifie que cette commande contient bien au moins un produit de ce vendeur
    const [match] = await sql`
      SELECT o.id
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN products p ON p.id = oi.product_id
      JOIN shops s ON s.id = p.shop_id
      WHERE o.id = ${orderId} AND s.vendor_id = ${userId}
      LIMIT 1
    `;

    if (!match) {
      return Response.json(
        { error: "Cette commande ne concerne pas votre boutique." },
        { status: 403 }
      );
    }

    const [updated] = await sql`
      UPDATE orders SET status = ${status} WHERE id = ${orderId}
      RETURNING id, status
    `;

    return Response.json({ order: updated });
  } catch (err) {
    console.error("Erreur mise à jour commande:", err);
    return Response.json(
      { error: "Erreur serveur lors de la mise à jour de la commande." },
      { status: 500 }
    );
  }
}
