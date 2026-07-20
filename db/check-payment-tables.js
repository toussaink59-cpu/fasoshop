// Vérifie si les tables payments, payouts, shop_commission_ledger existent en base
// Usage : node db/check-payment-tables.js

require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");

async function main() {
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

  try {
    const rows = await sql.unsafe(
      "SELECT table_name FROM information_schema.tables WHERE table_name IN ('payments','payouts','shop_commission_ledger')"
    );
    console.log("Tables trouvees :");
    console.table(rows);

    const found = rows.map((r) => r.table_name);
    const expected = ["payments", "payouts", "shop_commission_ledger"];
    const missing = expected.filter((t) => !found.includes(t));

    if (missing.length === 0) {
      console.log("OK - Les 3 tables existent deja.");
    } else {
      console.log("MANQUANT :", missing.join(", "));
    }
  } catch (err) {
    console.error("Erreur :", err.message);
  } finally {
    await sql.end();
  }
}

main();
