// Affiche le détail des commandes stockées en base (id, total, mode de paiement, statut)
// Usage : node db/check-orders.js

require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");

async function main() {
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

  try {
    const orders = await sql`
      SELECT id, status, total, payment_method, shipping_address, created_at
      FROM orders
      ORDER BY id
    `;
    console.log("📋 Commandes en base :");
    console.table(orders);
  } catch (err) {
    console.error("❌ Erreur :", err.message);
  } finally {
    await sql.end();
  }
}

main();
