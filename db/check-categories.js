// Liste les catégories existantes (parents et sous-catégories).
// Usage : node db/check-categories.js

require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");

async function main() {
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

  try {
    const categories = await sql`
      SELECT id, name, slug, emoji, parent_id
      FROM categories
      ORDER BY parent_id NULLS FIRST, name
    `;
    console.log(JSON.stringify(categories, null, 2));

    const productCounts = await sql`
      SELECT category_id, COUNT(*) AS count
      FROM products
      GROUP BY category_id
    `;
    console.log("--- Produits par categorie ---");
    console.log(JSON.stringify(productCounts, null, 2));
  } catch (err) {
    console.error("Erreur :", err.message);
  } finally {
    await sql.end();
  }
}

main();
