// Ajoute les colonnes nécessaires aux ventes flash :
// - flash_sale_ends_at : date/heure de fin de la vente flash (NULL = pas en vente flash)
// - flash_sale_stock_snapshot : stock au moment de l'activation, pour calculer
//   la barre "X articles restants" (vendus depuis le début de la vente flash)
// Usage : node db/add-flash-sales.js

require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");

async function main() {
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

  try {
    await sql.unsafe(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS flash_sale_ends_at TIMESTAMP;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS flash_sale_stock_snapshot INTEGER;
      CREATE INDEX IF NOT EXISTS idx_products_flash_sale ON products(flash_sale_ends_at);
    `);
    console.log("OK - Colonnes de vente flash ajoutees avec succes.");
  } catch (err) {
    console.error("Erreur :", err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
