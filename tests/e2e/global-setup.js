import postgres from "postgres";

export default async function globalSetup() {
  const url = process.env.E2E_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) {
    console.warn("[global-setup] DATABASE_URL absente, skip");
    return;
  }

  const sql = postgres(url, {
    max: 1,
    idle_timeout: 10,
    connect_timeout: 30,
    onnotice: () => {}, // Supprimer les NOTICE PostgreSQL
  });

  try {
    console.log("[global-setup] Connexion DB OK");

    // 1. Migration colonnes orders (avec catch)
    try {
      await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal INTEGER DEFAULT 0`;
      await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee INTEGER DEFAULT 0`;
      await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_code TEXT`;
      await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_discount INTEGER DEFAULT 0`;
      console.log("[global-setup] ✓ Colonnes orders OK");
    } catch (e) {
      console.warn("[global-setup] ⚠ Migration orders:", e.message);
    }

    // 2. Table notifications (avec catch)
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT,
          read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;
      console.log("[global-setup] ✓ Table notifications OK");
    } catch (e) {
      console.warn("[global-setup] ⚠ Table notifications:", e.message);
    }

    // 3. Vérifier qu'il y a au moins un shop
    try {
      const [shopCount] = await sql`SELECT COUNT(*) as count FROM shops`;
      if (parseInt(shopCount.count) === 0) {
        console.log("[global-setup] Aucun shop, création...");
        // Vérifier schema users
        const [userCols] = await sql`
          SELECT column_name FROM information_schema.columns 
          WHERE table_name = 'users'
        `;
        console.log("[global-setup] Colonnes users:", userCols.map(c => c.column_name).join(', '));
      } else {
        console.log("[global-setup] ✓", shopCount.count, "shop(s) existant(s)");
      }
    } catch (e) {
      console.warn("[global-setup] ⚠ Check shops:", e.message);
    }

    // 4. Vérifier produit 1
    try {
      const [prod] = await sql`SELECT id, stock_quantity FROM products WHERE id = 1`;
      if (prod) {
        await sql`UPDATE products SET stock_quantity = 10000, status = 'active' WHERE id = 1`;
        console.log("[global-setup] ✓ Produit 1 restocké (was:", prod.stock_quantity + ")");
      } else {
        console.log("[global-setup] Produit 1 absent, les tests créeront leurs propres produits");
      }
    } catch (e) {
      console.warn("[global-setup] ⚠ Produit 1:", e.message);
    }

    console.log("[global-setup] ✅ Setup terminé");
  } catch (e) {
    console.error("[global-setup] ❌ ERREUR FATALE:", e.message);
    console.error(e.stack);
  } finally {
    try {
      await sql.end();
    } catch {}
  }
}
