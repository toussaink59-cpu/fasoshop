// Compare les commandes existantes avec les entrées du ledger de commission.
// Usage : node db/check-ledger.js

require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");

async function main() {
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

  try {
    const orders = await sql`SELECT id, status, total FROM orders ORDER BY id DESC LIMIT 10`;
    console.log("Dernières commandes :");
    console.table(orders);

    const ledger = await sql`SELECT id, order_id, shop_id, gross_amount, commission_amount, delivery_status FROM shop_commission_ledger ORDER BY order_id DESC LIMIT 10`;
    console.log("Dernières sous-commandes (ledger) :");
    console.table(ledger);

    const shops = await sql`SELECT id, name, vendor_id FROM shops`;
    console.log("Boutiques :");
    console.table(shops);
  } catch (err) {
    console.error("Erreur :", err.message);
  } finally {
    await sql.end();
  }
}

main();
