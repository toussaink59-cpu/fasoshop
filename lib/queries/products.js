import sql from "@/lib/db";

export function parseImages(images) {
  if (Array.isArray(images)) return images;
  if (typeof images === "string") {
    try {
      return JSON.parse(images);
    } catch {
      return [];
    }
  }
  return [];
}

const SORT_CLAUSES = {
  newest: (sql) => sql`p.created_at DESC`,
  price_asc: (sql) => sql`p.price ASC`,
  price_desc: (sql) => sql`p.price DESC`,
  rating: (sql) => sql`avg_rating DESC NULLS LAST, p.created_at DESC`,
};

/**
 * Catalogue public — uniquement les produits actifs et en stock.
 * Filtres : category (slug), q (texte), minPrice, maxPrice, shopId,
 *           condition (neuf|quasi_neuf|occasion), brand, city, minRating (1-5)
 * Tri : newest|price_asc|price_desc|rating (défaut : newest)
 * Les produits sponsorisés actifs remontent toujours en tête de liste.
 *
 * @param {object} filters
 * @param {number|string|null} userId - utilisateur connecté, pour calculer is_favorited
 */
export async function getProducts(filters = {}, userId = null) {
  const {
    categorySlug = null,
    q = null,
    minPrice = null,
    maxPrice = null,
    shopId = null,
    condition = null,
    brand = null,
    city = null,
    minRating = null,
    sort = "newest",
  } = filters;

  const sortKey = SORT_CLAUSES[sort] ? sort : "newest";

  let products = await sql`
    SELECT p.id, p.name, p.description, p.price, p.compare_at_price, p.stock_quantity, p.images, p.condition,
           p.brand, p.created_at,
           (p.is_sponsored AND p.sponsored_until > NOW()) AS is_sponsored,
           s.id AS shop_id, s.name AS shop_name, s.city AS shop_city,
           c.name AS category_name, c.slug AS category_slug,
           COALESCE(r.avg_rating, 0) AS avg_rating, COALESCE(r.review_count, 0) AS review_count,
           (${userId}::int IS NOT NULL AND EXISTS (
             SELECT 1 FROM favorites f WHERE f.product_id = p.id AND f.user_id = ${userId}::int
           )) AS is_favorited
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
      AND (${brand}::text IS NULL OR p.brand = ${brand})
      AND (${city}::text IS NULL OR s.city = ${city})
      AND (${minRating}::numeric IS NULL OR COALESCE(r.avg_rating, 0) >= ${minRating}::numeric)
    ORDER BY (p.is_sponsored AND p.sponsored_until > NOW()) DESC, ${SORT_CLAUSES[sortKey](sql)}
  `;

  const now = Date.now();
  const NEW_WINDOW_MS = 14 * 24 * 60 * 60 * 1000; // 14 jours

  return products.map((p) => ({
    ...p,
    images: parseImages(p.images),
    isNew: p.created_at ? now - new Date(p.created_at).getTime() < NEW_WINDOW_MS : false,
  }));
}

// Marques distinctes utilisées par des produits actifs, pour le filtre catalogue.
export async function getBrands() {
  const rows = await sql`
    SELECT DISTINCT p.brand
    FROM products p
    JOIN shops s ON s.id = p.shop_id
    WHERE p.status = 'active' AND s.status = 'active' AND p.brand IS NOT NULL AND p.brand != ''
    ORDER BY p.brand ASC
  `;
  return rows.map((r) => r.brand);
}
