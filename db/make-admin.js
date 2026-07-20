// Promeut un utilisateur existant au rôle 'admin'
// Usage : node db/make-admin.js email@exemple.com

require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("❌ Usage : node db/make-admin.js email@exemple.com");
    process.exit(1);
  }

  const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

  try {
    const [user] = await sql`
      UPDATE users SET role = 'admin' WHERE email = ${email}
      RETURNING id, email, full_name, role
    `;

    if (!user) {
      console.error(`❌ Aucun utilisateur trouvé avec l'email ${email}`);
      process.exit(1);
    }

    console.log("✅ Utilisateur promu admin :", user);
  } catch (err) {
    console.error("❌ Erreur :", err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
