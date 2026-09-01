import postgres from "postgres";

export default async function globalSetup() {
  const url = process.env.E2E_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) { console.warn("[global-setup] DATABASE_URL absente, skip"); return; }

  const sql = postgres(url, { max: 1, idle_timeout: 5, connect_timeout: 10 });

  try {
    // Migration colonnes orders
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal INTEGER DEFAULT 0`;
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee INTEGER DEFAULT 0`;
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_code TEXT`;
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_discount INTEGER DEFAULT 0`;

    // Créer table notifications si absente
    await sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT,
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `;

    // Créer un shop de test si aucun n'existe
    const [shopCount] = await sql`SELECT COUNT(*) as count FROM shops`;
    if (parseInt(shopCount.count) === 0) {
      // Créer un user vendor de test
      await sql`
        INSERT INTO users (email, password_hash, role, full_name, status)
        VALUES ('test-vendor@example.com', 'dummy', 'vendor', 'Test Vendor', 'active')
        ON CONFLICT (email) DO NOTHING
      `;
      
      const [vendor] = await sql`SELECT id FROM users WHERE email = 'test-vendor@example.com'`;
      if (vendor) {
        await sql`
          INSERT INTO shops (vendor_id, name, status, delivery_fee, offers_delivery, offers_pickup)
          VALUES (${vendor.id}, 'Test Shop', 'active', 1000, true, true)
          ON CONFLICT DO NOTHING
        `;
      }
    }

    // S'assurer qu'il y a au moins un produit
    const [prodCount] = await sql`SELECT COUNT(*) as count FROM products`;
    if (parseInt(prodCount.count) === 0) {
      const [shop] = await sql`SELECT id FROM shops LIMIT 1`;
      if (shop) {
        await sql`
          INSERT INTO products (shop_id, name, price, stock_quantity, status, category)
          VALUES (${shop.id}, 'Test Product', 1000, 10000, 'active', 'general')
        `;
      }
    }

    // Restocker produit 1 s'il existe
    const [prod] = await sql`SELECT id, stock_quantity FROM products WHERE id = 1`;
    if (prod) {
      await sql`UPDATE products SET stock_quantity = 10000, status = 'active' WHERE id = 1`;
      console.log("[global-setup] produit 1 restocké (was: " + prod.stock_quantity + ")");
    }

    console.log("[global-setup] setup complet : colonnes + tables + données de base OK");
  } catch (e) {
    console.warn("[global-setup] warning:", e.message);
  } finally {
    try { await sql.end(); } catch {}
  }
}
