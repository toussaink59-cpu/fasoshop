// Crée la table addresses (carnet d'adresses par acheteur).
// Usage : node db/add-addresses.js

require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");

async function main() {
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

  try {
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS addresses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        libelle VARCHAR(100) NOT NULL,
        adresse_texte TEXT NOT NULL,
        phone VARCHAR(50),
        par_defaut BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
    `);
    console.log("OK - Table addresses creee avec succes.");
  } catch (err) {
    console.error("Erreur :", err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
