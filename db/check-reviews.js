// Affiche tous les avis présents en base.
// Usage : node db/check-reviews.js

require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");

async function main() {
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

  try {
    const reviews = await sql`SELECT * FROM reviews ORDER BY id`;
    console.log(`Nombre d'avis en base : ${reviews.length}`);
    console.table(reviews);
  } catch (err) {
    console.error("Erreur :", err.message);
  } finally {
    await sql.end();
  }
}

main();
