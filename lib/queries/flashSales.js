import sql from "@/lib/db";
import { parseImages } from "@/lib/queries/products";

// Produits actuellement en vente flash (date de fin non dépassée),
// triés par fin la plus proche en premier, limité à 8 produits.
export async function getActiveFlashSales() {
  try {

  const products = await sql`
    SELECT p.id, p.name, p.price, p.compare_at_price, p.stock_quantity, p.images, p.condition,
           p.flash_sale_ends_at, p.flash_sale_stock_snapshot,
           s.name AS shop_name
    FROM products p
    JOIN shops s ON s.id = p.shop_id
    WHERE p.flash_sale_ends_at IS NOT NULL
      AND p.flash_sale_ends_at > NOW()
      AND p.status = 'active' AND s.status = 'active'
      AND p.stock_quantity > 0
    ORDER BY p.flash_sale_ends_at ASC
    LIMIT 8
  `;

  return products.map((p) => ({ ...p, images: parseImages(p.images) }));
  } catch (err) {
    console.error('[flashSales.js:getActiveFlashSales] DB error:', err.message);
    return [];
  }
}
