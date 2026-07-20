require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");

async function main() {
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });
  try {
    const tables = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_name IN ('payments', 'payouts', 'shop_commission_ledger')
    `;
    console.log(tables);
  } catch (err) {
    console.log("Erreur:", err.message);
  } finally {
    await sql.end();
  }
}

main();