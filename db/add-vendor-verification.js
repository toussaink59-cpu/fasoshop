// Ajoute les champs de vérification d'identité vendeur (type et numéro de
// pièce d'identité, motif de rejet, date de vérification) à la table shops.
// Usage : node db/add-vendor-verification.js

require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");

async function main() {
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

  try {
    await sql.unsafe(`
      ALTER TABLE shops ADD COLUMN IF NOT EXISTS id_document_type VARCHAR(20);
      ALTER TABLE shops ADD COLUMN IF NOT EXISTS id_document_number VARCHAR(100);
      ALTER TABLE shops ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
      ALTER TABLE shops ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;
    `);
    console.log("OK - Colonnes de verification vendeur ajoutees avec succes.");
  } catch (err) {
    console.error("Erreur :", err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
