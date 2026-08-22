import { req, report } from '../lib.js';

async function main() {
  console.log('\n=== 02 - cron auth (fail-closed) ===');
  const endpoints = ['/api/cron/expire-orders', '/api/cron/auto-confirm', '/api/cron/cleanup-reset-tokens'];
  let allPass = true;

  for (const ep of endpoints) {
    const r1 = await req('POST', ep);
    if (r1.error) { console.log('[SKIP]', ep, '-', r1.error); continue; }
    const pass1 = r1.status === 500 || r1.status === 401;
    if (!report(`${ep} sans auth`, pass1, `status=${r1.status}`)) allPass = false;

    const r2 = await req('POST', ep, { headers: { authorization: 'Bearer bad' } });
    if (r2.error) { console.log('[SKIP]', ep, '-', r2.error); continue; }
    const pass2 = r2.status === 500 || r2.status === 401;
    if (!report(`${ep} Bearer invalide`, pass2, `status=${r2.status}`)) allPass = false;
  }
  process.exitCode = allPass ? 0 : 1;
}

main();
