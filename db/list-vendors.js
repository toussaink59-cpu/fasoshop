// Affiche les comptes vendeurs et leur boutique associée.
// Usage : node db/list-vendors.js

require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");

async function main() {
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

  try {
    const vendors = await sql`
      SELECT u.id AS user_id, u.email, u.full_name, s.id AS shop_id, s.name AS shop_name
      FROM users u
      JOIN shops s ON s.vendor_id = u.id
      ORDER BY u.id
    `;
    console.table(vendors);
  } catch (err) {
    console.error("Erreur :", err.message);
  } finally {
    await sql.end();
  }
}

main();
