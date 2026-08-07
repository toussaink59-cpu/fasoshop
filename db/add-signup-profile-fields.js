// Ajoute :
//  - users.first_name / users.last_name (colonnes nullable, en plus de
//    full_name qui reste à jour automatiquement — aucun des 24 fichiers
//    existants qui affichent full_name n'a besoin d'être modifié).
//  - users.date_of_birth, users.nationality, users.country_of_residence
//    (profil vendeur enrichi).
//  - shops.main_category_id (catégorie principale de la boutique, lien
//    vers la table categories déjà existante).
//
// Pour les comptes déjà existants : first_name/last_name sont déduits de
// full_name (premier mot = prénom, reste = nom — approximatif mais
// raisonnable ; à corriger manuellement si besoin depuis l'admin).
//
// Usage : node db/add-signup-profile-fields.js

require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");

async function main() {
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

  try {
    await sql.unsafe(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(120);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(120);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS nationality VARCHAR(100);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS country_of_residence VARCHAR(100);

      ALTER TABLE shops ADD COLUMN IF NOT EXISTS main_category_id INTEGER REFERENCES categories(id);
    `);
    console.log("OK - Colonnes ajoutees.");

    // Rétro-remplissage des comptes existants (approximatif : premier mot
    // = prénom, reste = nom). Ne touche pas les lignes déjà renseignées.
    const result = await sql.unsafe(`
      UPDATE users
      SET
        first_name = split_part(full_name, ' ', 1),
        last_name = NULLIF(trim(substring(full_name from position(' ' in full_name))), '')
      WHERE first_name IS NULL AND full_name IS NOT NULL AND full_name != ''
    `);
    console.log(`OK - ${result.count} compte(s) existant(s) retro-rempli(s) (prenom/nom approximatifs).`);
  } catch (err) {
    console.error("Erreur :", err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
