import sql from "@/lib/db";
import { parseImages } from "@/lib/queries/products";

// Boutique publique : uniquement les boutiques actives
export async function getPublicShop(id) {
  try {

  const [shop] = await sql`
    SELECT s.id, s.name, s.description, s.city, s.created_at
    FROM shops s
    WHERE s.id = ${id} AND s.status = 'active'
  `;
  return shop || null;
  } catch (err) {
    console.error('[shopPublic.js:getPublicShop] DB error:', err.message);
    return [];
  }
}

// Produits ACTIFS ET EN STOCK d'une boutique (vitrine = que du vendable)
export async function getShopProducts(shopId) {
  try {

  const rows = await sql`
    SELECT p.id, p.name, p.price, p.compare_at_price, p.images, p.stock_quantity, p.condition
    FROM products p
    WHERE p.shop_id = ${shopId}
      AND p.status = 'active'
      AND p.stock_quantity > 0
    ORDER BY p.created_at DESC
  `;
  return rows.map((p) => ({ ...p, images: parseImages(p.images) }));
  } catch (err) {
    console.error('[shopPublic.js:getShopProducts] DB error:', err.message);
    return [];
  }
}