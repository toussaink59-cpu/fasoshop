import sql from "@/lib/db";

function parseImages(images) {
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

// GET /api/products/homepage
// Renvoie les produits les plus vendus (bestSellers) et les plus récents
// (newArrivals), uniquement des boutiques actives (vérifiées), avec la note
// moyenne de la boutique.
export async function GET() {
  const shopRatingJoin = sql`
    LEFT JOIN (
      SELECT p2.shop_id, AVG(r.rating)::numeric(2,1) AS avg_rating, COUNT(r.id) AS review_count
      FROM reviews r
      JOIN products p2 ON p2.id = r.product_id
      GROUP BY p2.shop_id
    ) sr ON sr.shop_id = s.id
  `;

  const bestSellersRaw = await sql`
    SELECT p.id, p.name, p.price, p.compare_at_price, p.images, s.name AS shop_name,
           COALESCE(sr.avg_rating, 0) AS shop_rating, COALESCE(sr.review_count, 0) AS shop_review_count,
           COALESCE(SUM(oi.quantity), 0) AS total_sold
    FROM products p
    JOIN shops s ON s.id = p.shop_id
    LEFT JOIN order_items oi ON oi.product_id = p.id
    LEFT JOIN orders o ON o.id = oi.order_id AND o.status IN ('paid', 'shipped', 'delivered')
    ${shopRatingJoin}
    WHERE s.status = 'active'
    GROUP BY p.id, p.name, p.price, p.compare_at_price, p.images, s.name, sr.avg_rating, sr.review_count
    ORDER BY total_sold DESC, p.id DESC
    LIMIT 8
  `;

  const newArrivalsRaw = await sql`
    SELECT p.id, p.name, p.price, p.compare_at_price, p.images, s.name AS shop_name,
           COALESCE(sr.avg_rating, 0) AS shop_rating, COALESCE(sr.review_count, 0) AS shop_review_count
    FROM products p
    JOIN shops s ON s.id = p.shop_id
    ${shopRatingJoin}
    WHERE s.status = 'active'
    ORDER BY p.id DESC
    LIMIT 8
  `;

  const bestSellers = bestSellersRaw.map((p) => ({ ...p, images: parseImages(p.images) }));
  const newArrivals = newArrivalsRaw.map((p) => ({ ...p, images: parseImages(p.images) }));

  return Response.json({ bestSellers, newArrivals });
}
