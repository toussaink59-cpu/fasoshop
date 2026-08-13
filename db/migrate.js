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

  console.log("⏳ Exécution du schéma sur la base Neon (transaction atomique)...");
  
  try {
    // 🔒 Transaction atomique : tout ou rien (rollback auto si erreur)
    await sql.begin(async (tx) => {
      await tx.unsafe(schema);
    });
    console.log("✅ Migration terminée avec succès (atomique).");
  } catch (err) {
    console.error("❌ Erreur pendant la migration (rollback automatique) :", err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();