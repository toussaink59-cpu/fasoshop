import sql from "@/lib/db";

// GET /api/flash-sales
// Renvoie les produits actuellement en vente flash (date de fin non dépassée),
// triés par fin la plus proche en premier, limité à 8 produits.
export async function GET() {
  const products = await sql`
    SELECT p.id, p.name, p.price, p.compare_at_price, p.stock_quantity, p.images, p.condition,
           p.flash_sale_ends_at, p.flash_sale_stock_snapshot,
           s.name AS shop_name
    FROM products p
    JOIN shops s ON s.id = p.shop_id
    WHERE p.flash_sale_ends_at IS NOT NULL
      AND p.flash_sale_ends_at > NOW()
      AND p.status = 'active' AND s.status = 'active'
      AND p.stock_quantity > 0
    ORDER BY p.flash_sale_ends_at ASC
    LIMIT 8
  `;

  const parsed = products.map((p) => ({
    ...p,
    images: typeof p.images === "string" ? JSON.parse(p.images) : p.images,
  }));

  return Response.json({ products: parsed });
}
