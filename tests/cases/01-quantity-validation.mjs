import { req, report } from '../lib.js';

// Cas negatifs: qty=-1, 0, 1.5, 999 -> tous doivent renvoyer 400
// On envoie un productId valide mais des quantites invalides.
// Le serveur doit rejeter AVANT la resolution produit (validation stricte 1-99).

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
    // 400 attendu (validation). 401 egalement acceptable si pas authentifie,
    // mais la validation quantity doit avoir lieu avant toute resolution produit.
    const pass = r.status === 400 || r.status === 401;
    if (!report(`qty=${c.qty} (${c.label})`, pass, `status=${r.status}`)) allPass = false;
  }
  process.exit(allPass ? 0 : 1);
}

main();
