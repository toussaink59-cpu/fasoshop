// Affiche les images enregistrées pour chaque produit.
// Usage : node db/check-product-images.js

require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");

async function main() {
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

  try {
    const products = await sql`
      SELECT id, name, images FROM products ORDER BY id DESC
    `;
    console.log("Produits et leurs images :");
    products.forEach((p) => {
      console.log(`- [${p.id}] ${p.name} :`, p.images);
    });
  } catch (err) {
    console.error("Erreur :", err.message);
  } finally {
    await sql.end();
  }
}

main();
