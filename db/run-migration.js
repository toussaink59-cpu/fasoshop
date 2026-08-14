import sql from "../lib/db.js";
import fs from "fs";

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error("Usage: node db/run-migration.js migrations/024_promo_codes.sql");
  process.exit(1);
}

const sqlContent = fs.readFileSync(migrationFile, "utf-8");

(async () => {
  try {
    console.log(`⏳ Exécution de ${migrationFile}...`);
    await sql.unsafe(sqlContent);
    console.log("✅ Migration exécutée avec succès !");
    process.exit(0);
  } catch (err) {
    console.error("❌ Erreur:", err.message);
    process.exit(1);
  }
})();