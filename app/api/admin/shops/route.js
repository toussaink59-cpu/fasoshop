import sql from "@/lib/db";

// GET /api/admin/shops
// Liste toutes les boutiques avec un résumé de leur stock total
export async function GET() {
  const shops = await sql`
    SELECT s.id, s.name, s.status, u.full_name AS vendor_name, u.email AS vendor_email,
           COUNT(p.id) AS product_count,
           COALESCE(SUM(p.stock_quantity), 0) AS total_stock
    FROM shops s
    JOIN users u ON u.id = s.vendor_id
    LEFT JOIN products p ON p.shop_id = s.id
    GROUP BY s.id, s.name, s.status, u.full_name, u.email
    ORDER BY s.name
  `;

  return Response.json({ shops });
}
