import fs from 'fs';
const p = 'app/components/HeroCarousel.js';
let t = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
if (t.includes('styles.eyebrow')) { console.log('Deja present'); process.exit(0); }
t = t.replace('      href: "/shop",\n      cta: "Découvrir le catalogue",', '      eyebrow: "Kimoxa",\n      href: "/shop",\n      cta: "Découvrir le catalogue",');
t = t.replace('      image: (p.images && p.images[0]) || null,', '      eyebrow: p.shop_name || "À la une",\n      image: (p.images && p.images[0]) || null,');
t = t.replace('      href: "/devenir-vendeur",', '      eyebrow: "Vendeurs",\n      href: "/devenir-vendeur",');
t = t.replace('            <div className={styles.copy}>\n              <h2 className={styles.title}>{s.title}</h2>', '            <div className={styles.copy}>\n              <span className={styles.eyebrow}>{s.eyebrow}</span>\n              <h2 className={styles.title}>{s.title}</h2>');
fs.writeFileSync(p, t, 'utf8');
console.log('eyebrows ajoutes OK');
