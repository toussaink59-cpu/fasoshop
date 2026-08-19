import fs from 'fs';
import path from 'path';
import postgres from 'postgres';
import dotenv from 'dotenv';

// Charger .env.local
dotenv.config({ path: '.env.local' });

async function main() {
  console.log('\n=== 05 - migration drift ===');

  if (!process.env.DATABASE_URL) {
    console.log('[SKIP] DATABASE_URL non defini');
    process.exit(0);
  }

  const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });
  try {
    const dir = path.join(process.cwd(), 'migrations');
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();

    let tracked = [];
    try {
      const rows = await sql`SELECT filename FROM schema_migrations ORDER BY filename`;
      tracked = rows.map(r => r.filename);
    } catch (e) {
      console.log('[FAIL] schema_migrations absente - lancer `node db/migrate.js`');
      process.exit(1);
    }

    const trackedSet = new Set(tracked);
    const missing = files.filter(f => !trackedSet.has(f));
    const orphan = tracked.filter(f => !files.includes(f));

    console.log(`Fichiers: ${files.length}, Trackes: ${tracked.length}`);
    if (missing.length) console.log('[FAIL] Non trackees:', missing);
    if (orphan.length) console.log('[WARN] Orphelines en DB:', orphan);

    const pass = missing.length === 0;
    console.log(pass ? '[PASS] Aucune migration manquante' : '[FAIL] Drift detecte');
    process.exit(pass ? 0 : 1);
  } finally {
    await sql.end();
  }
}

main();
