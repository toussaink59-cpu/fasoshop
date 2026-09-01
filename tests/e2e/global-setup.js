import postgres from "postgres";

export default async function globalSetup() {
  const url = process.env.E2E_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) { console.warn("[global-setup] DATABASE_URL absente, skip"); return; }
  
  const sql = postgres(url, { max: 1, idle_timeout: 5, connect_timeout: 10 });
  
  try {
    // Sérialiser toutes les requêtes (Neon pooler n'aime pas le parallèle)
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal INTEGER DEFAULT 0`;
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee INTEGER DEFAULT 0`;
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_code TEXT`;
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_discount INTEGER DEFAULT 0`;
    
    // Vérifier que le produit 1 existe
    const [prod] = await sql`SELECT id, stock_quantity FROM products WHERE id = 1`;
    if (prod) {
      await sql`UPDATE products SET stock_quantity = 10000, status = 'active' WHERE id = 1`;
      console.log("[global-setup] produit 1 restocké (was: " + prod.stock_quantity + ")");
    } else {
      // Créer un produit de test si absent
      await sql`INSERT INTO products (id, name, price, stock_quantity, status, category, shop_id) 
                 VALUES (1, 'Test Product', 1000, 10000, 'active', 'general', 
                         (SELECT id FROM shops LIMIT 1))`
        .catch(() => console.warn("[global-setup] produit 1 absent et création impossible"));
    }
    
    console.log("[global-setup] colonnes orders OK");
  } catch (e) {
    console.warn("[global-setup] warning:", e.message);
  } finally {
    try { await sql.end(); } catch {}
  }
}
