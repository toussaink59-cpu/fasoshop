// Ajoute les colonnes nécessaires au flux de commande (adresse, téléphone, mode de paiement)
// Usage : node db/add-order-fields.js

require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");

async function main() {
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

  try {
    await sql.unsafe(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address TEXT;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) NOT NULL DEFAULT 'cod';
    `);
    console.log("✅ Colonnes de commande ajoutées avec succès.");
  } catch (err) {
    console.error("❌ Erreur :", err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
