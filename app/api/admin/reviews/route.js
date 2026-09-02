import sql from "@/lib/db";
import { adminGuard } from "@/lib/adminAuth";
import { parsePagination, buildPaginationMeta } from "@/lib/pagination";

// GET /api/admin/reviews
// Liste tous les avis avec pagination pour modération admin.
// Query params : ?page=1&limit=25
export async function GET(request) {
  const guardError = await adminGuard(request);
  if (guardError) return guardError;

  // P2-13 : pagination
  const { page, limit, offset } = parsePagination(request);

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
    LIMIT ${limit} OFFSET ${offset}
  `;

  const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM reviews`;

  return Response.json({
    reviews,
    pagination: buildPaginationMeta(page, limit, Number(count)),
  });
}
