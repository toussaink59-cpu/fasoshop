import sql from "@/lib/db";

// GET /api/shops/directory
// Liste les boutiques actives (vérifiées) avec leur note moyenne et leur
// nombre de produits, pour la page publique "Nos vendeurs".
export async function GET() {
  const shops = await sql`
    SELECT s.id, s.name, u.full_name AS vendor_name,
           COUNT(DISTINCT p.id) AS product_count,
           COALESCE(AVG(r.rating), 0)::numeric(2,1) AS avg_rating,
           COUNT(DISTINCT r.id) AS review_count
    FROM shops s
    JOIN users u ON u.id = s.vendor_id
    LEFT JOIN products p ON p.shop_id = s.id
    LEFT JOIN reviews r ON r.product_id = p.id
    WHERE s.status = 'active'
    GROUP BY s.id, s.name, u.full_name
    ORDER BY avg_rating DESC, product_count DESC
  `;

  return Response.json({ shops });
}
