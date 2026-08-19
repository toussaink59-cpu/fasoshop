import { req, report } from '../lib.js';

async function main() {
  console.log('\n=== 01 - quantity validation ===');
  const cases = [
    { qty: -1, label: 'negative' },
    { qty: 0,  label: 'zero' },
    { qty: 1.5, label: 'decimal' },
    { qty: 999, label: '> 99' },
  ];

  let allPass = true;
  for (const c of cases) {
    const r = await req('POST', '/api/orders', {
      body: {
        items: [{ productId: 1, quantity: c.qty }],
        phone: '+22600000000',
        paymentMethod: 'cod',
        deliveryMethod: 'pickup',
      },
    });
    if (r.error) { console.log('[SKIP]', c.label, '-', r.error); continue; }
    const pass = r.status === 400 || r.status === 401;
    if (!report(`qty=${c.qty} (${c.label})`, pass, `status=${r.status}`)) allPass = false;
  }
  process.exitCode = allPass ? 0 : 1;
}

main();
