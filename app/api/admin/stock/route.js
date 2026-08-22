import sql from "@/lib/db";
import { adminGuard } from "@/lib/adminAuth";

// GET /api/admin/stock
// L'administrateur voit TOUS les produits de TOUTES les boutiques.
// Filtres optionnels via query params : ?shopId=  &lowStockOnly=true
export async function GET(request) {
  const guardError = await adminGuard(request);
  if (guardError) return guardError;

  const { searchParams } = new URL(request.url);
  const shopId = searchParams.get("shopId");
  const lowStockOnly = searchParams.get("lowStockOnly") === "true";

  let products;

  if (shopId && lowStockOnly) {
    products = await sql`
      SELECT p.id, p.name, p.sku, p.price, p.stock_quantity, p.low_stock_threshold,
             p.status, p.updated_at, s.id AS shop_id, s.name AS shop_name,
             u.full_name AS vendor_name, u.email AS vendor_email
      FROM products p
      JOIN shops s ON s.id = p.shop_id
      JOIN users u ON u.id = s.vendor_id
      WHERE s.id = ${shopId} AND p.stock_quantity <= p.low_stock_threshold
      ORDER BY p.stock_quantity ASC
    `;
  } else if (shopId) {
    products = await sql`
      SELECT p.id, p.name, p.sku, p.price, p.stock_quantity, p.low_stock_threshold,
             p.status, p.updated_at, s.id AS shop_id, s.name AS shop_name,
             u.full_name AS vendor_name, u.email AS vendor_email
      FROM products p
      JOIN shops s ON s.id = p.shop_id
      JOIN users u ON u.id = s.vendor_id
      WHERE s.id = ${shopId}
      ORDER BY p.updated_at DESC
    `;
  } else if (lowStockOnly) {
    products = await sql`
      SELECT p.id, p.name, p.sku, p.price, p.stock_quantity, p.low_stock_threshold,
             p.status, p.updated_at, s.id AS shop_id, s.name AS shop_name,
             u.full_name AS vendor_name, u.email AS vendor_email
      FROM products p
      JOIN shops s ON s.id = p.shop_id
      JOIN users u ON u.id = s.vendor_id
      WHERE p.stock_quantity <= p.low_stock_threshold
      ORDER BY p.stock_quantity ASC
    `;
  } else {
    products = await sql`
      SELECT p.id, p.name, p.sku, p.price, p.stock_quantity, p.low_stock_threshold,
             p.status, p.updated_at, s.id AS shop_id, s.name AS shop_name,
             u.full_name AS vendor_name, u.email AS vendor_email
      FROM products p
      JOIN shops s ON s.id = p.shop_id
      JOIN users u ON u.id = s.vendor_id
      ORDER BY s.name, p.updated_at DESC
    `;
  }

  return Response.json({ products, count: products.length });
}
