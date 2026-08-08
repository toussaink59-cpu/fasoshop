import sql from "@/lib/db";

// POST /api/orders/[id]/confirm-receipt
// Le CLIENT confirme la réception → statut "delivered" + DÉBLOCAGE du payout vendeur.
// body: { shopId }
export async function POST(request, { params }) {
  const userId = request.headers.get("x-user-id");
  const { id: orderId } = await params;

  try {
    const { shopId } = await request.json();

    const [order] = await sql`
      SELECT id, buyer_id FROM orders WHERE id = ${orderId}
    `;
    if (!order || String(order.buyer_id) !== String(userId)) {
      return Response.json({ error: "Commande introuvable." }, { status: 404 });
    }

    const updated = await sql`
      UPDATE shop_commission_ledger
      SET delivery_status = 'delivered',
          payout_status = 'released',
          payout_released_at = NOW()
      WHERE order_id = ${orderId} AND shop_id = ${shopId}
      RETURNING id
    `;

    if (updated.length === 0) {
      return Response.json({ error: "Sous-commande introuvable." }, { status: 404 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("Erreur confirmation réception:", err);
    return Response.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
