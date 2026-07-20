require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");

async function main() {
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });
  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_name IN ('payments', 'payouts', 'shop_commission_ledger')
  `;
  console.log(tables);

  const columns = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'shops' AND column_name LIKE 'mobile_money%'
  `;
  console.log(columns);

  await sql.end();
}

main();