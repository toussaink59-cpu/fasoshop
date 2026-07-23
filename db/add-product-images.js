// Ajoute la colonne images (liste d'URLs) aux produits.
// Usage : node db/add-product-images.js

require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");

async function main() {
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

  try {
    await sql.unsafe(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]';
    `);
    console.log("OK - Colonne images ajoutee avec succes.");
  } catch (err) {
    console.error("Erreur :", err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();