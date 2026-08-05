import sql from "@/lib/db";
import { parseImages } from "@/lib/queries/products";

/**
 * Recommandations personnalisées, basées sur un signal réel : les
 * catégories des produits déjà achetés ou mis en favoris par
 * l'utilisateur. Aucune donnée simulée — si l'utilisateur n'a ni achat
 * ni favori (nouveau compte, ou visiteur non connecté), la fonction
 * retourne un tableau vide plutôt que d'afficher des produits au hasard
 * sous une étiquette "recommandé" trompeuse.
 */
export async function getRecommendedProducts(userId, limit = 8) {
  if (!userId) return [];

  const categoryRows = await sql`
    SELECT DISTINCT p.category_id
    FROM (
      SELECT oi.product_id FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.buyer_id = ${userId}
      UNION
      SELECT f.product_id FROM favorites f WHERE f.user_id = ${userId}
    ) purchased_or_favorited
    JOIN products p ON p.id = purchased_or_favorited.product_id
    WHERE p.category_id IS NOT NULL
  `;

  const categoryIds = categoryRows.map((r) => r.category_id);
  if (categoryIds.length === 0) return [];

  const products = await sql`
    SELECT p.id, p.name, p.price, p.compare_at_price, p.images, p.condition,
           (p.is_sponsored AND p.sponsored_until > NOW()) AS is_sponsored,
           s.name AS shop_name, (s.verified_at IS NOT NULL) AS shop_verified,
           COALESCE(r.avg_rating, 0) AS avg_rating, COALESCE(r.review_count, 0) AS review_count
    FROM products p
    JOIN shops s ON s.id = p.shop_id
    LEFT JOIN (
      SELECT product_id, AVG(rating)::numeric(2,1) AS avg_rating, COUNT(*)::int AS review_count
      FROM reviews GROUP BY product_id
    ) r ON r.product_id = p.id
    WHERE p.status = 'active' AND s.status = 'active'
      AND p.category_id = ANY(${categoryIds})
      AND p.id NOT IN (
        SELECT product_id FROM favorites WHERE user_id = ${userId}
      )
      AND p.id NOT IN (
        SELECT oi.product_id FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.buyer_id = ${userId}
      )
    ORDER BY COALESCE(r.avg_rating, 0) DESC, r.review_count DESC NULLS LAST, p.created_at DESC
    LIMIT ${limit}
  `;

  return products.map((p) => ({ ...p, images: parseImages(p.images) }));
}
