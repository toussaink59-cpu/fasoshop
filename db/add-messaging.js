// Crée les tables conversations et messages pour la messagerie entre
// acheteur et vendeur, liée à une commande + une boutique.
// Usage : node db/add-messaging.js

require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");

async function main() {
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

  try {
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        buyer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        last_message_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(order_id, shop_id)
      );

      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        sender_id INTEGER NOT NULL REFERENCES users(id),
        sender_role VARCHAR(10) NOT NULL CHECK (sender_role IN ('buyer', 'vendor')),
        body TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        read_at TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
    `);
    console.log("OK - Tables conversations et messages creees.");
  } catch (err) {
    console.error("Erreur :", err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
