import sql from "@/lib/db";
import { parseImages } from "@/lib/queries/products";

/**
 * Produits les plus vendus (bestSellers) et les plus récents (newArrivals),
 * uniquement des boutiques actives (vérifiées), avec la note moyenne de la boutique.
 *
 * NOTE : cette fonction/route existe mais n'est actuellement appelée par aucune
 * page du frontend (app/page.js ne l'utilise plus). Conservée telle quelle
 * (aucune suppression de fonctionnalité sans demande explicite) — à réintégrer
 * dans la page d'accueil ou à retirer selon la décision produit.
 */
export async function getHomepageProducts() {
  const shopRatingJoin = sql`
    LEFT JOIN (
      SELECT p2.shop_id, AVG(r.rating)::numeric(2,1) AS avg_rating, COUNT(r.id) AS review_count
      FROM reviews r
      JOIN products p2 ON p2.id = r.product_id
      GROUP BY p2.shop_id
    ) sr ON sr.shop_id = s.id
  `;

  const bestSellersRaw = await sql`
    SELECT p.id, p.name, p.price, p.compare_at_price, p.images, p.condition, s.name AS shop_name,
           COALESCE(sr.avg_rating, 0) AS shop_rating, COALESCE(sr.review_count, 0) AS shop_review_count,
           COALESCE(SUM(oi.quantity), 0) AS total_sold
    FROM products p
    JOIN shops s ON s.id = p.shop_id
    LEFT JOIN order_items oi ON oi.product_id = p.id
    LEFT JOIN orders o ON o.id = oi.order_id AND o.status IN ('paid', 'shipped', 'delivered')
    ${shopRatingJoin}
    WHERE s.status = 'active'
    GROUP BY p.id, p.name, p.price, p.compare_at_price, p.images, p.condition, s.name, sr.avg_rating, sr.review_count
    ORDER BY RANDOM()
    LIMIT 8
  `;

  const newArrivalsRaw = await sql`
    SELECT p.id, p.name, p.price, p.compare_at_price, p.images, p.condition, s.name AS shop_name,
           COALESCE(sr.avg_rating, 0) AS shop_rating, COALESCE(sr.review_count, 0) AS shop_review_count
    FROM products p
    JOIN shops s ON s.id = p.shop_id
    ${shopRatingJoin}
    WHERE s.status = 'active'
    ORDER BY RANDOM()
    LIMIT 8
  `;

  return {
    bestSellers: bestSellersRaw.map((p) => ({ ...p, images: parseImages(p.images) })),
    newArrivals: newArrivalsRaw.map((p) => ({ ...p, images: parseImages(p.images) })),
  };
}
