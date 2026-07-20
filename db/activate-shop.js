// Active une boutique (passe son statut à 'active') pour qu'elle apparaisse
// dans le catalogue public.
// Usage : node db/activate-shop.js email-du-vendeur@exemple.com

require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("❌ Usage : node db/activate-shop.js email-du-vendeur@exemple.com");
    process.exit(1);
  }

  const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

  try {
    const [shop] = await sql`
      UPDATE shops
      SET status = 'active'
      WHERE vendor_id = (SELECT id FROM users WHERE email = ${email})
      RETURNING id, name, status
    `;

    if (!shop) {
      console.error(`❌ Aucune boutique trouvée pour le vendeur ${email}`);
      process.exit(1);
    }

    console.log("✅ Boutique activée :", shop);
  } catch (err) {
    console.error("❌ Erreur :", err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
