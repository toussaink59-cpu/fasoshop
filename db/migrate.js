// Runner de migrations idempotent
// Usage : node db/migrate.js
// - Cree la table schema_migrations si absente
// - Applique uniquement les migrations non encore executees
// - Transaction atomique par migration

require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const postgres = require("postgres");

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL manquant dans .env.local");
    process.exit(1);
  }

  const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

  try {
    // 1. Creer la table de tracking si absente
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Lister les migrations deja appliquees
    const applied = await sql`SELECT filename FROM schema_migrations`;
    const appliedSet = new Set(applied.map(r => r.filename));

    // 3. Lister les fichiers migrations/*.sql
    const migrationsDir = path.join(__dirname, "..", "migrations");
    if (!fs.existsSync(migrationsDir)) {
      console.log("Aucun dossier migrations/ trouve");
      return;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith(".sql"))
      .sort();

    console.log(`Migrations trouvees: ${files.length}`);
    console.log(`Deja appliquees: ${appliedSet.size}`);

    // 4. Appliquer les migrations manquantes
    let count = 0;
    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`  [skip] ${file}`);
        continue;
      }

      console.log(`  [run]  ${file}...`);
      const sqlContent = fs.readFileSync(path.join(migrationsDir, file), "utf-8");

      try {
        await sql.begin(async (tx) => {
          await tx.unsafe(sqlContent);
          await tx`INSERT INTO schema_migrations (filename) VALUES (${file})`;
        });
        console.log(`  [ok]   ${file}`);
        count++;
      } catch (err) {
        console.error(`  [FAIL] ${file}: ${err.message}`);
        process.exit(1);
      }
    }

    console.log(`\n${count} migration(s) appliquee(s).`);
  } catch (err) {
    console.error("Erreur migration:", err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
