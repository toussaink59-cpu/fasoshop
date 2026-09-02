import sql from "@/lib/db";
import { adminGuard } from "@/lib/adminAuth";
import { parsePagination, buildPaginationMeta } from "@/lib/pagination";

// GET /api/admin/shops
// Liste toutes les boutiques avec pagination.
// Query params : ?page=1&limit=25
export async function GET(request) {
  const guardError = await adminGuard(request);
  if (guardError) return guardError;

  // P2-13 : pagination
  const { page, limit, offset } = parsePagination(request);

  const shops = await sql`
    SELECT s.id, s.name, s.status, s.id_document_type, s.id_document_number,
           s.id_document_url, s.rejection_reason, s.verified_at, s.city,
           u.full_name AS vendor_name, u.email AS vendor_email, u.phone AS vendor_phone,
           COUNT(p.id) AS product_count,
           COALESCE(SUM(p.stock_quantity), 0) AS total_stock
    FROM shops s
    JOIN users u ON u.id = s.vendor_id
    LEFT JOIN products p ON p.shop_id = s.id
    GROUP BY s.id, s.name, s.status, s.id_document_type, s.id_document_number,
             s.id_document_url, s.rejection_reason, s.verified_at, s.city,
             u.full_name, u.email, u.phone
    ORDER BY
      CASE s.status WHEN 'pending' THEN 0 WHEN 'rejected' THEN 1 WHEN 'active' THEN 2 ELSE 3 END,
      s.name
    LIMIT ${limit} OFFSET ${offset}
  `;

  const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM shops`;

  return Response.json({
    shops,
    pagination: buildPaginationMeta(page, limit, Number(count)),
  });
}
