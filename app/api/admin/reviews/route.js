import sql from "@/lib/db";
import { adminGuard } from "@/lib/adminAuth";

// GET /api/admin/reviews
// Liste tous les avis, avec le produit, la boutique et l'auteur — pour modération admin.
export async function GET(request) {
  const guardError = adminGuard(request);
  if (guardError) return guardError;

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
