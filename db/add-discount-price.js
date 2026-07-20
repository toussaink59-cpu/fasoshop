// Ajoute la colonne compare_at_price (prix avant réduction) aux produits.
// Si compare_at_price > price, le produit affiche un badge de réduction.
// Usage : node db/add-discount-price.js

require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");

async function main() {
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

  try {
    await sql.unsafe(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS compare_at_price NUMERIC(12, 2);
    `);
    console.log("OK - Colonne compare_at_price ajoutee avec succes.");
  } catch (err) {
    console.error("Erreur :", err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
