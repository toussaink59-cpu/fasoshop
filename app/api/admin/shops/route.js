import sql from "@/lib/db";
// GET /api/admin/shops
// Liste toutes les boutiques avec un résumé de leur stock total et les
// infos de pièce d'identité fournies à l'inscription (pour vérification).
export async function GET() {
  const shops = await sql`
    SELECT s.id, s.name, s.status, s.id_document_type, s.id_document_number,
           s.rejection_reason, s.verified_at,
           u.full_name AS vendor_name, u.email AS vendor_email,
           COUNT(p.id) AS product_count,
           COALESCE(SUM(p.stock_quantity), 0) AS total_stock
    FROM shops s
    JOIN users u ON u.id = s.vendor_id
    LEFT JOIN products p ON p.shop_id = s.id
    GROUP BY s.id, s.name, s.status, s.id_document_type, s.id_document_number,
             s.rejection_reason, s.verified_at, u.full_name, u.email
    ORDER BY
      CASE s.status WHEN 'pending' THEN 0 WHEN 'rejected' THEN 1 WHEN 'active' THEN 2 ELSE 3 END,
      s.name
  `;
  return Response.json({ shops });
}
