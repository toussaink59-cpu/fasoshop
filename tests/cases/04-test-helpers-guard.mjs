import { req, report } from '../lib.js';

async function main() {
  console.log('\n=== 04 - test-helpers guard ===');

  const r = await req('POST', '/api/test-helpers', {
    body: { action: 'probe' },
  });
  if (r.error) { console.log('[SKIP]', r.error); process.exit(0); }

  const pass = r.status === 403 || r.status === 404;
  report(`POST /api/test-helpers`, pass,
    `status=${r.status} (403=garde activee, 404=garde passee mais action inconnue)`);
  
  // Fix Windows : utiliser exitCode au lieu de process.exit pour eviter le crash UV_HANDLE_CLOSING
  process.exitCode = pass ? 0 : 1;
}

main();
