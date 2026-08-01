import sql from "@/lib/db";

const SORT_CLAUSES = {
  newest: sql => sql`p.created_at DESC`,
  price_asc: sql => sql`p.price ASC`,
  price_desc: sql => sql`p.price DESC`,
  rating: sql => sql`avg_rating DESC NULLS LAST, p.created_at DESC`,
};

// GET /api/products
// Catalogue public — uniquement les produits actifs et en stock.
// Filtres : ?category=slug &q=texte &minPrice=N &maxPrice=N &shopId=N &condition=neuf|quasi_neuf|occasion
// Tri : ?sort=newest|price_asc|price_desc|rating (défaut : newest)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const categorySlug = searchParams.get("category");
  const q = searchParams.get("q");
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const shopId = searchParams.get("shopId");
  const condition = searchParams.get("condition");
  const sortKey = SORT_CLAUSES[searchParams.get("sort")] ? searchParams.get("sort") : "newest";

  let products = await sql`
    SELECT p.id, p.name, p.description, p.price, p.compare_at_price, p.stock_quantity, p.images, p.condition,
           p.created_at, s.id AS shop_id, s.name AS shop_name,
           c.name AS category_name, c.slug AS category_slug,
           COALESCE(r.avg_rating, 0) AS avg_rating, COALESCE(r.review_count, 0) AS review_count
    FROM products p
    JOIN shops s ON s.id = p.shop_id
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN (
      SELECT product_id, AVG(rating)::numeric(2,1) AS avg_rating, COUNT(*)::int AS review_count
      FROM reviews
      GROUP BY product_id
    ) r ON r.product_id = p.id
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
      AND (${condition}::text IS NULL OR p.condition = ${condition})
    ORDER BY ${SORT_CLAUSES[sortKey](sql)}
  `;

  const now = Date.now();
  const NEW_WINDOW_MS = 14 * 24 * 60 * 60 * 1000; // 14 jours

  products = products.map((p) => ({
    ...p,
    images: typeof p.images === "string" ? JSON.parse(p.images) : p.images,
    isNew: p.created_at ? now - new Date(p.created_at).getTime() < NEW_WINDOW_MS : false,
  }));

  return Response.json({ products, total: products.length });
}
