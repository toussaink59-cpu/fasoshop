import sql from "@/lib/db";
import { parseImages } from "@/lib/queries/products";

/**
 * NOTE CORRECTIF (réintégration Phase 2) : la version précédente de cette
 * requête triait les deux listes par `ORDER BY RANDOM()`, ce qui veut dire
 * que "bestSellers" n'était en réalité PAS trié par ventes, et "newArrivals"
 * PAS trié par date. Le champ total_sold était calculé mais jamais utilisé
 * pour le tri. Corrigé ci-dessous. Le filtre p.status = 'active' manquait
 * aussi (seul le statut de la boutique était vérifié).
 */

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

// Produits les plus vendus — quantité réellement livrée/payée uniquement.
export async function getBestSellers(limit = 8) {
  const rows = await sql`
    SELECT ${PRODUCT_FIELDS}, COALESCE(r.avg_rating, 0) AS avg_rating, COALESCE(r.review_count, 0) AS review_count,
           COALESCE(SUM(oi.quantity), 0) AS total_sold
    FROM products p
    JOIN shops s ON s.id = p.shop_id
    LEFT JOIN order_items oi ON oi.product_id = p.id
    LEFT JOIN orders o ON o.id = oi.order_id AND o.status IN ('paid', 'shipped', 'delivered')
    ${RATING_JOIN}
    WHERE p.status = 'active' AND s.status = 'active'
    GROUP BY p.id, p.name, p.price, p.compare_at_price, p.stock_quantity, p.images, p.condition,
             p.is_sponsored, p.sponsored_until, s.id, s.name, s.verified_at, r.avg_rating, r.review_count
    HAVING COALESCE(SUM(oi.quantity), 0) > 0
    ORDER BY total_sold DESC
    LIMIT ${limit}
  `;
  return finalize(rows);
}

// Produits les plus récents.
export async function getNewArrivals(limit = 8) {
  const rows = await sql`
    SELECT ${PRODUCT_FIELDS}, p.created_at, COALESCE(r.avg_rating, 0) AS avg_rating, COALESCE(r.review_count, 0) AS review_count
    FROM products p
    JOIN shops s ON s.id = p.shop_id
    ${RATING_JOIN}
    WHERE p.status = 'active' AND s.status = 'active'
    ORDER BY p.created_at DESC
    LIMIT ${limit}
  `;
  return finalize(rows);
}

// Produits les mieux notés (au moins une note), pour la section "Populaires".
export async function getTopRated(limit = 8) {
  const rows = await sql`
    SELECT ${PRODUCT_FIELDS}, COALESCE(r.avg_rating, 0) AS avg_rating, COALESCE(r.review_count, 0) AS review_count
    FROM products p
    JOIN shops s ON s.id = p.shop_id
    ${RATING_JOIN}
    WHERE p.status = 'active' AND s.status = 'active' AND r.review_count > 0
    ORDER BY r.avg_rating DESC, r.review_count DESC
    LIMIT ${limit}
  `;
  return finalize(rows);
}

// Conservé pour compatibilité avec /api/products/homepage (voir ce fichier).
export async function getHomepageProducts() {
  const [bestSellers, newArrivals] = await Promise.all([getBestSellers(), getNewArrivals()]);
  return { bestSellers, newArrivals };
}
