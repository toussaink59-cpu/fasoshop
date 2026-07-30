import sql from "@/lib/db";

// GET /api/products
// Catalogue public — uniquement les produits actifs et en stock.
// Filtres optionnels : ?category=slug &q=texte &minPrice=N &maxPrice=N &shopId=N
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const categorySlug = searchParams.get("category");
  const q = searchParams.get("q");
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const shopId = searchParams.get("shopId");

  let products = await sql`
    SELECT p.id, p.name, p.description, p.price, p.compare_at_price, p.stock_quantity, p.images, p.condition,
           s.id AS shop_id, s.name AS shop_name,
           c.name AS category_name, c.slug AS category_slug
    FROM products p
    JOIN shops s ON s.id = p.shop_id
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.status = 'active' AND s.status = 'active'
      AND (${categorySlug}::text IS NULL OR p.category_id IN (
        SELECT id FROM categories
        WHERE slug = ${categorySlug}
           OR parent_id = (SELECT id FROM categories WHERE slug = ${categorySlug})
      ))
      AND (${q}::text IS NULL OR p.name ILIKE ${q ? `%${q}%` : null})
      AND (${minPrice}::numeric IS NULL OR p.price >= ${minPrice}::numeric)
      AND (${maxPrice}::numeric IS NULL OR p.price <= ${maxPrice}::numeric)
      AND (${shopId}::int IS NULL OR s.id = ${shopId}::int)
    ORDER BY p.created_at DESC
  `;

  products = products.map((p) => ({
    ...p,
    images: typeof p.images === "string" ? JSON.parse(p.images) : p.images,
  }));

  return Response.json({ products });
}
