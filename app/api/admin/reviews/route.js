import sql from "@/lib/db";

// GET /api/admin/reviews
// Liste tous les avis, avec le produit, la boutique et l'auteur — pour modération admin.
export async function GET() {
  const reviews = await sql`
    SELECT r.id, r.rating, r.comment, r.created_at,
           u.full_name AS buyer_name, u.email AS buyer_email,
           p.id AS product_id, p.name AS product_name,
           s.name AS shop_name
    FROM reviews r
    JOIN users u ON u.id = r.buyer_id
    JOIN products p ON p.id = r.product_id
    JOIN shops s ON s.id = p.shop_id
    ORDER BY r.created_at DESC
  `;

  return Response.json({ reviews });
}
