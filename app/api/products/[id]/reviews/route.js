import sql from "@/lib/db";
import { getProductReviews } from "@/lib/queries/productDetail";

// GET /api/products/[id]/reviews
export async function GET(request, { params }) {
  const { id } = await params;
  const reviews = await getProductReviews(id);
  return Response.json({ reviews });
}

// POST /api/products/[id]/reviews
// body: { rating, comment? }
// Autorisé seulement si l'acheteur a une commande confirmée contenant ce produit.
export async function POST(request, { params }) {
  const { id } = await params;
  const userId = request.headers.get("x-user-id");

  if (!userId) {
    return Response.json({ error: "Connexion requise." }, { status: 401 });
  }

  try {
    const { rating, comment } = await request.json();
    const ratingNum = Number(rating);

    if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
      return Response.json({ error: "Note invalide (1 à 5)." }, { status: 400 });
    }

    const [eligibleItem] = await sql`
      SELECT oi.id
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.product_id = ${id}
        AND o.buyer_id = ${userId}
        AND o.status IN ('paid', 'shipped', 'delivered')
      LIMIT 1
    `;

    if (!eligibleItem) {
      return Response.json(
        { error: "Vous devez avoir acheté ce produit (commande confirmée) pour laisser un avis." },
        { status: 403 }
      );
    }

    const [review] = await sql`
      INSERT INTO reviews (product_id, buyer_id, order_item_id, rating, comment)
      VALUES (${id}, ${userId}, ${eligibleItem.id}, ${ratingNum}, ${comment || null})
      ON CONFLICT (product_id, buyer_id)
      DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment
      RETURNING id, rating, comment, created_at
    `;

    return Response.json({ review }, { status: 201 });
  } catch (err) {
    console.error("Erreur création avis:", err);
    return Response.json({ error: "Erreur serveur lors de l'enregistrement de l'avis." }, { status: 500 });
  }
}
