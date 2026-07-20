// Exécute le schéma SQL contre la base Neon définie dans .env.local
// Usage : npm run db:migrate

require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const postgres = require("postgres");

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL manquant dans .env.local");
    process.exit(1);
  }

  const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });
  const schemaPath = path.join(__dirname, "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf-8");

  console.log("⏳ Exécution du schéma sur la base Neon...");
  try {
    await sql.unsafe(schema);
    console.log("✅ Migration terminée avec succès.");
  } catch (err) {
    console.error("❌ Erreur pendant la migration :", err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
