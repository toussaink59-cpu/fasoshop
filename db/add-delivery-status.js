// Ajoute delivery_status à shop_commission_ledger, pour un suivi de livraison
// indépendant par boutique au sein d'une même commande (sous-commande).
// Usage : node db/add-delivery-status.js

require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");

async function main() {
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

  try {
    await sql.unsafe(`
      ALTER TABLE shop_commission_ledger
        ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(20) NOT NULL DEFAULT 'preparation'
        CHECK (delivery_status IN ('preparation', 'shipped', 'delivered', 'cancelled'));
    `);
    console.log("OK - Colonne delivery_status ajoutee avec succes.");
  } catch (err) {
    console.error("Erreur :", err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
