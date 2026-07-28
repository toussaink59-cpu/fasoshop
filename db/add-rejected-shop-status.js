// Met à jour la contrainte CHECK sur shops.status pour autoriser 'rejected'
// en plus de 'pending', 'active', 'suspended'.
// Usage : node db/add-rejected-shop-status.js

require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");

async function main() {
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

  try {
    await sql.unsafe(`
      ALTER TABLE shops DROP CONSTRAINT IF EXISTS shops_status_check;
      ALTER TABLE shops ADD CONSTRAINT shops_status_check
        CHECK (status IN ('pending', 'active', 'suspended', 'rejected'));
    `);
    console.log("OK - Statut 'rejected' autorise sur shops.status.");
  } catch (err) {
    console.error("Erreur :", err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
