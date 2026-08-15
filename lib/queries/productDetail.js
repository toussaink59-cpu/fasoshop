import sql from "@/lib/db";
import { parseImages } from "@/lib/queries/products";

// Détail public d'un produit actif (boutique active), avec note moyenne
// + options de livraison du vendeur (modèle v3).
export async function getProductDetail(id) {
  const [product] = await sql`
    SELECT p.id, p.name, p.description, p.price, p.compare_at_price, p.stock_quantity,
           p.sku, p.images, p.condition, p.flash_sale_ends_at,
           s.id AS shop_id, s.name AS shop_name,
           s.delivery_fee, s.offers_delivery, s.offers_pickup,
           c.name AS category_name, c.slug AS category_slug
    FROM products p
    JOIN shops s ON s.id = p.shop_id
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.id = ${id} AND p.status = 'active' AND s.status = 'active'
  `;

  if (!product) return null;

  const [ratingStats] = await sql`
    SELECT COALESCE(AVG(rating), 0)::float AS avg_rating, COUNT(*)::int AS review_count
    FROM reviews WHERE product_id = ${id}
  `;

  return {
    ...product,
    images: parseImages(product.images),
    avg_rating: ratingStats.avg_rating,
    review_count: ratingStats.review_count,
  };
}

// Avis clients d'un produit, du plus récent au plus ancien.
export async function getProductReviews(id) {
  return sql`
    SELECT r.id, r.rating, r.comment, r.created_at, u.full_name AS buyer_name
    FROM reviews r
    JOIN users u ON u.id = r.buyer_id
    WHERE r.product_id = ${id}
    ORDER BY r.created_at DESC
  `;
}