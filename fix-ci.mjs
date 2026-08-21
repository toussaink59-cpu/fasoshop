import fs from 'fs';
const p = '.github/workflows/e2e-security.yml';
let c = fs.readFileSync(p, 'utf8');
const before = c;
c = c.split('${{ secrets.DATABASE_URL }}').join('${{ secrets.E2E_DATABASE_URL }}');
if (c === before) { console.log('❌ Aucun remplacement trouvé'); process.exit(1); }
fs.writeFileSync(p, c, 'utf8');
console.log('[ok] workflow : secrets.DATABASE_URL -> secrets.E2E_DATABASE_URL');
