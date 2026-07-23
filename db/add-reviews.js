// Crée la table reviews (avis produits), liée à un achat confirmé.
// Usage : node db/add-reviews.js

require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");

async function main() {
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

  try {
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        buyer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        order_item_id INTEGER REFERENCES order_items(id),
        rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
        comment TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (product_id, buyer_id)
      );
      CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
    `);
    console.log("OK - Table reviews creee avec succes.");
  } catch (err) {
    console.error("Erreur :", err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
