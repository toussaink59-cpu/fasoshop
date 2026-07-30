// Ajoute la colonne "condition" à la table products, pour préciser l'état
// de la marchandise : neuf, quasi_neuf ou occasion.
// Usage : node db/add-product-condition.js

require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");

async function main() {
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

  try {
    await sql.unsafe(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS condition VARCHAR(20) NOT NULL DEFAULT 'neuf';
      ALTER TABLE products DROP CONSTRAINT IF EXISTS products_condition_check;
      ALTER TABLE products ADD CONSTRAINT products_condition_check
        CHECK (condition IN ('neuf', 'quasi_neuf', 'occasion'));
    `);
    console.log("OK - Colonne condition ajoutee aux produits.");
  } catch (err) {
    console.error("Erreur :", err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
