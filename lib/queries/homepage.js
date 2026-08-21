import sql from "@/lib/db";
import { parseImages } from "@/lib/queries/products";

const PRODUCT_FIELDS = sql`
  p.id, p.name, p.price, p.compare_at_price, p.stock_quantity, p.images, p.condition,
  p.is_sponsored, p.sponsored_until,
  s.id AS shop_id, s.name AS shop_name,
  (s.verified_at IS NOT NULL) AS shop_verified
`;

const RATING_JOIN = sql`
  LEFT JOIN (
    SELECT product_id, AVG(rating)::numeric(2,1) AS avg_rating, COUNT(*)::int AS review_count
    FROM reviews
    GROUP BY product_id
  ) r ON r.product_id = p.id
`;

function finalize(rows) {
  return rows.map((p) => ({
    ...p,
    images: parseImages(p.images),
    is_sponsored: Boolean(p.is_sponsored && p.sponsored_until && new Date(p.sponsored_until) > new Date()),
  }));
}

// Produits les plus vendus — uniquement ceux EN STOCK (Temu-style).
// Les produits sponsorisés actifs remontent toujours en tête de liste.
export async function getBestSellers(limit = 8) {
  try {

  const rows = await sql`
    SELECT ${PRODUCT_FIELDS}, COALESCE(r.avg_rating, 0) AS avg_rating, COALESCE(r.review_count, 0) AS review_count,
           COALESCE(SUM(oi.quantity), 0) AS total_sold
    FROM products p
    JOIN shops s ON s.id = p.shop_id
    LEFT JOIN order_items oi ON oi.product_id = p.id
    LEFT JOIN orders o ON o.id = oi.order_id AND o.status IN ('paid', 'shipped', 'delivered')
    ${RATING_JOIN}
    WHERE p.status = 'active'
      AND s.status = 'active'
      AND p.stock_quantity > 0
    GROUP BY p.id, p.name, p.price, p.compare_at_price, p.stock_quantity, p.images, p.condition,
             p.is_sponsored, p.sponsored_until, s.id, s.name, s.verified_at, r.avg_rating, r.review_count
    HAVING COALESCE(SUM(oi.quantity), 0) > 0
    ORDER BY (p.is_sponsored AND p.sponsored_until > NOW()) DESC, total_sold DESC
    LIMIT ${limit}
  `;
  return finalize(rows);
  } catch (err) {
    console.error('[homepage.js:getBestSellers] DB error:', err.message);
    return [];
  }
}

// Produits les plus récents — uniquement ceux EN STOCK (Temu-style).
// Les produits sponsorisés actifs remontent toujours en tête de liste.
export async function getNewArrivals(limit = 8) {
  try {

  const rows = await sql`
    SELECT ${PRODUCT_FIELDS}, p.created_at, COALESCE(r.avg_rating, 0) AS avg_rating, COALESCE(r.review_count, 0) AS review_count
    FROM products p
    JOIN shops s ON s.id = p.shop_id
    ${RATING_JOIN}
    WHERE p.status = 'active'
      AND s.status = 'active'
      AND p.stock_quantity > 0
    ORDER BY (p.is_sponsored AND p.sponsored_until > NOW()) DESC, p.created_at DESC
    LIMIT ${limit}
  `;
  return finalize(rows);
  } catch (err) {
    console.error('[homepage.js:getNewArrivals] DB error:', err.message);
    return [];
  }
}

// Produits les mieux notés — uniquement ceux EN STOCK (Temu-style).
// Les produits sponsorisés actifs remontent toujours en tête de liste.
export async function getTopRated(limit = 8) {
  try {

  const rows = await sql`
    SELECT ${PRODUCT_FIELDS}, COALESCE(r.avg_rating, 0) AS avg_rating, COALESCE(r.review_count, 0) AS review_count
    FROM products p
    JOIN shops s ON s.id = p.shop_id
    ${RATING_JOIN}
    WHERE p.status = 'active'
      AND s.status = 'active'
      AND p.stock_quantity > 0
      AND r.review_count > 0
    ORDER BY (p.is_sponsored AND p.sponsored_until > NOW()) DESC, r.avg_rating DESC, r.review_count DESC
    LIMIT ${limit}
  `;
  return finalize(rows);
  } catch (err) {
    console.error('[homepage.js:getTopRated] DB error:', err.message);
    return [];
  }
}

// Conservé pour compatibilité avec /api/products/homepage.
export async function getHomepageProducts() {
  try {

  const [bestSellers, newArrivals] = await Promise.all([getBestSellers(), getNewArrivals()]);
  return { bestSellers, newArrivals };
  } catch (err) {
    console.error('[homepage.js:getHomepageProducts] DB error:', err.message);
    return [];
  }
}
