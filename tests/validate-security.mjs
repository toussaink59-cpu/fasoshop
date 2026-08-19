import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const casesDir = path.join(process.cwd(), 'tests', 'cases');
const files = fs.readdirSync(casesDir).filter(f => f.endsWith('.mjs')).sort();

console.log('=== Fasoshop Security Validation ===');
console.log(`BASE_URL: ${process.env.BASE_URL || 'http://localhost:3000'}`);
console.log(`${files.length} cas a executer\n`);

let failed = 0;
const results = [];

for (const f of files) {
  const p = path.join(casesDir, f);
  const r = spawnSync('node', [p], { stdio: 'inherit', env: process.env });
  const ok = r.status === 0;
  results.push({ file: f, ok });
  if (!ok) failed++;
}

console.log('\n=== Resume ===');
for (const r of results) {
  console.log(`[${r.ok ? 'PASS' : 'FAIL'}] ${r.file}`);
}
console.log(`\n${results.length - failed}/${results.length} cas passent.`);
process.exit(failed === 0 ? 0 : 1);
