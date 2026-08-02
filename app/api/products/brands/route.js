import sql from "@/lib/db";

// GET /api/products/brands
// Liste les marques distinctes utilisées par des produits actifs, pour le filtre.
export async function GET() {
  const rows = await sql`
    SELECT DISTINCT p.brand
    FROM products p
    JOIN shops s ON s.id = p.shop_id
    WHERE p.status = 'active' AND s.status = 'active' AND p.brand IS NOT NULL AND p.brand != ''
    ORDER BY p.brand ASC
  `;
  return Response.json({ brands: rows.map((r) => r.brand) });
}
