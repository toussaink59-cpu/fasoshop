// Vérifie si la table addresses existe en base et affiche sa structure si oui.
// Usage : node db/check-addresses-table.js

require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");

async function main() {
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

  try {
    const tables = await sql`
      SELECT table_name FROM information_schema.tables WHERE table_name = 'addresses'
    `;

    if (tables.length === 0) {
      console.log("La table 'addresses' n'existe PAS en base.");
      return;
    }

    console.log("La table 'addresses' existe. Colonnes :");
    const columns = await sql`
      SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'addresses'
    `;
    console.table(columns);
  } catch (err) {
    console.error("Erreur :", err.message);
  } finally {
    await sql.end();
  }
}

main();
