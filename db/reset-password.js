require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");
const bcrypt = require("bcryptjs");

async function main() {
  const email = process.argv[2];
  const newPassword = process.argv[3];

  if (!email || !newPassword) {
    console.error("Usage : node db/reset-password.js email@exemple.com nouveauMotDePasse");
    process.exit(1);
  }

  const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

  try {
    const passwordHash = await bcrypt.hash(newPassword, 10);

    const [user] = await sql`
      UPDATE users SET password_hash = ${passwordHash}
      WHERE email = ${email}
      RETURNING id, email, full_name, role
    `;

    if (!user) {
      console.error(`Aucun utilisateur trouve avec l'email ${email}`);
      process.exit(1);
    }

    console.log("Mot de passe reinitialise pour :", user);
  } catch (err) {
    console.error("Erreur :", err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();