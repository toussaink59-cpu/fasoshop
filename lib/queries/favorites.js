import sql from "@/lib/db";
import { parseImages } from "@/lib/queries/products";

// Produits favoris de l'utilisateur, du plus récent au plus ancien.
export async function getFavoriteProducts(userId) {
  const products = await sql`
    SELECT p.id, p.name, p.price, p.compare_at_price, p.images, p.condition,
           s.name AS shop_name,
           COALESCE(r.avg_rating, 0) AS avg_rating, COALESCE(r.review_count, 0) AS review_count
    FROM favorites f
    JOIN products p ON p.id = f.product_id
    JOIN shops s ON s.id = p.shop_id
    LEFT JOIN (
      SELECT product_id, AVG(rating)::numeric(2,1) AS avg_rating, COUNT(*)::int AS review_count
      FROM reviews GROUP BY product_id
    ) r ON r.product_id = p.id
    WHERE f.user_id = ${userId}
    ORDER BY f.created_at DESC
  `;

  return products.map((p) => ({ ...p, images: parseImages(p.images) }));
}
