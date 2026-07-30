// Remplace entièrement l'arborescence de catégories par une structure
// façon Jumia (9 catégories principales + sous-catégories), en réaffectant
// proprement les produits déjà catégorisés.
// Usage : node db/rebuild-categories-jumia.js

require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");

const TREE = [
  {
    name: "Téléphones & Tablettes", slug: "telephones", emoji: "📱",
    children: [
      { name: "Smartphones", slug: "telephones-smartphones" },
      { name: "Tablettes", slug: "telephones-tablettes" },
      { name: "Accessoires", slug: "telephones-accessoires" },
    ],
  },
  {
    name: "Électronique", slug: "electronique", emoji: "🖥️",
    children: [
      { name: "Téléviseurs", slug: "electronique-televiseurs" },
      { name: "Home cinéma", slug: "electronique-homecinema" },
      { name: "Appareils photo", slug: "electronique-photo" },
    ],
  },
  {
    name: "Informatique", slug: "informatique", emoji: "💻",
    children: [
      { name: "Ordinateurs portables", slug: "informatique-portables" },
      { name: "PC de bureau", slug: "informatique-bureau" },
      { name: "Imprimantes", slug: "informatique-imprimantes" },
    ],
  },
  {
    name: "Maison & Bureau", slug: "maison", emoji: "🏠",
    children: [
      { name: "Électroménager", slug: "maison-electromenager" },
      { name: "Meubles", slug: "maison-meubles" },
      { name: "Décoration", slug: "maison-decoration" },
    ],
  },
  {
    name: "Mode", slug: "mode", emoji: "👕",
    children: [
      { name: "Vêtements Homme", slug: "mode-homme" },
      { name: "Vêtements Femme", slug: "mode-femme" },
      { name: "Vêtements Enfant", slug: "mode-enfant" },
      { name: "Chaussures", slug: "mode-chaussures" },
      { name: "Accessoires", slug: "mode-accessoires" },
    ],
  },
  {
    name: "Santé & Beauté", slug: "beaute", emoji: "💄",
    children: [
      { name: "Maquillage", slug: "beaute-maquillage" },
      { name: "Parfums", slug: "beaute-parfums" },
      { name: "Soins de la peau", slug: "beaute-soins" },
    ],
  },
  {
    name: "Supermarché", slug: "supermarche", emoji: "🛒",
    children: [
      { name: "Épicerie", slug: "supermarche-epicerie" },
      { name: "Produits d'entretien", slug: "supermarche-entretien" },
      { name: "Boissons", slug: "supermarche-boissons" },
    ],
  },
  {
    name: "Bébés & Jouets", slug: "bebes", emoji: "🧸",
    children: [
      { name: "Couches", slug: "bebes-couches" },
      { name: "Jeux", slug: "bebes-jeux" },
      { name: "Articles de puériculture", slug: "bebes-puericulture" },
    ],
  },
  {
    name: "Sports & Loisirs", slug: "sports", emoji: "⚽",
    children: [
      { name: "Équipements de fitness", slug: "sports-fitness" },
      { name: "Vêtements de sport", slug: "sports-vetements" },
    ],
  },
];

// Réaffectation des anciennes catégories vers les nouvelles, pour les
// produits déjà publiés (constaté : category_id 9 -> Téléphones, 12 -> Mode Homme)
const OLD_TO_NEW_SLUG = {
  9: "telephones-smartphones",
  12: "mode-homme",
};

async function main() {
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

  try {
    // 1. Sauvegarder les produits déjà catégorisés avec leur ancienne catégorie
    const oldAssignments = await sql`
      SELECT id, category_id FROM products WHERE category_id IS NOT NULL
    `;

    // 2. Libérer les produits de toute référence à l'ancienne arborescence
    await sql`UPDATE products SET category_id = NULL WHERE category_id IS NOT NULL`;

    // 3. Supprimer l'ancienne arborescence
    await sql`DELETE FROM categories`;

    // 4. Recréer l'arborescence façon Jumia
    for (const parent of TREE) {
      const [parentRow] = await sql`
        INSERT INTO categories (name, slug, emoji, parent_id)
        VALUES (${parent.name}, ${parent.slug}, ${parent.emoji}, NULL)
        RETURNING id
      `;
      for (const child of parent.children) {
        await sql`
          INSERT INTO categories (name, slug, emoji, parent_id)
          VALUES (${child.name}, ${child.slug}, NULL, ${parentRow.id})
        `;
      }
    }

    // 5. Réaffecter les produits qui avaient déjà une catégorie
    for (const { id, category_id } of oldAssignments) {
      const newSlug = OLD_TO_NEW_SLUG[category_id];
      if (!newSlug) continue;
      const [newCat] = await sql`SELECT id FROM categories WHERE slug = ${newSlug}`;
      if (newCat) {
        await sql`UPDATE products SET category_id = ${newCat.id} WHERE id = ${id}`;
      }
    }

    console.log(`OK - Arborescence reconstruite (${TREE.length} categories principales).`);
    console.log(`OK - ${oldAssignments.length} produit(s) reaffecte(s) quand possible.`);
  } catch (err) {
    console.error("Erreur :", err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
