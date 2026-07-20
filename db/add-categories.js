// Crée la table categories (avec hiérarchie parent/enfant), la peuple avec
// des catégories de départ, et relie products.category_id.
// Usage : node db/add-categories.js

require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");

async function main() {
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

  try {
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        parent_id INTEGER REFERENCES categories(id),
        emoji VARCHAR(10),
        sort_order INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);

      ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id);
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

      -- Catégories principales
      INSERT INTO categories (name, slug, emoji, sort_order) VALUES
        ('Électronique', 'electronique', '🖥', 1),
        ('Mode', 'mode', '👕', 2),
        ('Alimentation', 'alimentation', '🍎', 3),
        ('Maison', 'maison', '🏠', 4),
        ('Auto', 'auto', '🚗', 5),
        ('Beauté', 'beaute', '💄', 6),
        ('Livres', 'livres', '📚', 7)
      ON CONFLICT (slug) DO NOTHING;

      -- Sous-catégories : Électronique
      INSERT INTO categories (name, slug, parent_id, sort_order)
      SELECT 'Téléviseurs', 'electronique-televiseurs', id, 1 FROM categories WHERE slug='electronique'
      ON CONFLICT (slug) DO NOTHING;
      INSERT INTO categories (name, slug, parent_id, sort_order)
      SELECT 'Téléphones & Tablettes', 'electronique-telephones', id, 2 FROM categories WHERE slug='electronique'
      ON CONFLICT (slug) DO NOTHING;
      INSERT INTO categories (name, slug, parent_id, sort_order)
      SELECT 'Ordinateurs', 'electronique-ordinateurs', id, 3 FROM categories WHERE slug='electronique'
      ON CONFLICT (slug) DO NOTHING;
      INSERT INTO categories (name, slug, parent_id, sort_order)
      SELECT 'Audio & Hifi', 'electronique-audio', id, 4 FROM categories WHERE slug='electronique'
      ON CONFLICT (slug) DO NOTHING;

      -- Sous-catégories : Mode
      INSERT INTO categories (name, slug, parent_id, sort_order)
      SELECT 'Vêtements Homme', 'mode-homme', id, 1 FROM categories WHERE slug='mode'
      ON CONFLICT (slug) DO NOTHING;
      INSERT INTO categories (name, slug, parent_id, sort_order)
      SELECT 'Vêtements Femme', 'mode-femme', id, 2 FROM categories WHERE slug='mode'
      ON CONFLICT (slug) DO NOTHING;
      INSERT INTO categories (name, slug, parent_id, sort_order)
      SELECT 'Chaussures', 'mode-chaussures', id, 3 FROM categories WHERE slug='mode'
      ON CONFLICT (slug) DO NOTHING;
      INSERT INTO categories (name, slug, parent_id, sort_order)
      SELECT 'Accessoires', 'mode-accessoires', id, 4 FROM categories WHERE slug='mode'
      ON CONFLICT (slug) DO NOTHING;

      -- Sous-catégories : Alimentation
      INSERT INTO categories (name, slug, parent_id, sort_order)
      SELECT 'Épicerie', 'alimentation-epicerie', id, 1 FROM categories WHERE slug='alimentation'
      ON CONFLICT (slug) DO NOTHING;
      INSERT INTO categories (name, slug, parent_id, sort_order)
      SELECT 'Boissons', 'alimentation-boissons', id, 2 FROM categories WHERE slug='alimentation'
      ON CONFLICT (slug) DO NOTHING;
      INSERT INTO categories (name, slug, parent_id, sort_order)
      SELECT 'Produits Locaux', 'alimentation-locaux', id, 3 FROM categories WHERE slug='alimentation'
      ON CONFLICT (slug) DO NOTHING;

      -- Sous-catégories : Maison
      INSERT INTO categories (name, slug, parent_id, sort_order)
      SELECT 'Meubles', 'maison-meubles', id, 1 FROM categories WHERE slug='maison'
      ON CONFLICT (slug) DO NOTHING;
      INSERT INTO categories (name, slug, parent_id, sort_order)
      SELECT 'Électroménager', 'maison-electromenager', id, 2 FROM categories WHERE slug='maison'
      ON CONFLICT (slug) DO NOTHING;
      INSERT INTO categories (name, slug, parent_id, sort_order)
      SELECT 'Décoration', 'maison-decoration', id, 3 FROM categories WHERE slug='maison'
      ON CONFLICT (slug) DO NOTHING;
      INSERT INTO categories (name, slug, parent_id, sort_order)
      SELECT 'Cuisine', 'maison-cuisine', id, 4 FROM categories WHERE slug='maison'
      ON CONFLICT (slug) DO NOTHING;

      -- Sous-catégories : Auto
      INSERT INTO categories (name, slug, parent_id, sort_order)
      SELECT 'Pièces Auto', 'auto-pieces', id, 1 FROM categories WHERE slug='auto'
      ON CONFLICT (slug) DO NOTHING;
      INSERT INTO categories (name, slug, parent_id, sort_order)
      SELECT 'Accessoires Moto', 'auto-moto', id, 2 FROM categories WHERE slug='auto'
      ON CONFLICT (slug) DO NOTHING;
      INSERT INTO categories (name, slug, parent_id, sort_order)
      SELECT 'Pneus', 'auto-pneus', id, 3 FROM categories WHERE slug='auto'
      ON CONFLICT (slug) DO NOTHING;

      -- Sous-catégories : Beauté
      INSERT INTO categories (name, slug, parent_id, sort_order)
      SELECT 'Soins Visage', 'beaute-visage', id, 1 FROM categories WHERE slug='beaute'
      ON CONFLICT (slug) DO NOTHING;
      INSERT INTO categories (name, slug, parent_id, sort_order)
      SELECT 'Maquillage', 'beaute-maquillage', id, 2 FROM categories WHERE slug='beaute'
      ON CONFLICT (slug) DO NOTHING;
      INSERT INTO categories (name, slug, parent_id, sort_order)
      SELECT 'Parfums', 'beaute-parfums', id, 3 FROM categories WHERE slug='beaute'
      ON CONFLICT (slug) DO NOTHING;
      INSERT INTO categories (name, slug, parent_id, sort_order)
      SELECT 'Cheveux', 'beaute-cheveux', id, 4 FROM categories WHERE slug='beaute'
      ON CONFLICT (slug) DO NOTHING;

      -- Sous-catégories : Livres
      INSERT INTO categories (name, slug, parent_id, sort_order)
      SELECT 'Scolaire', 'livres-scolaire', id, 1 FROM categories WHERE slug='livres'
      ON CONFLICT (slug) DO NOTHING;
      INSERT INTO categories (name, slug, parent_id, sort_order)
      SELECT 'Romans', 'livres-romans', id, 2 FROM categories WHERE slug='livres'
      ON CONFLICT (slug) DO NOTHING;
      INSERT INTO categories (name, slug, parent_id, sort_order)
      SELECT 'Papeterie', 'livres-papeterie', id, 3 FROM categories WHERE slug='livres'
      ON CONFLICT (slug) DO NOTHING;
    `);

    console.log("OK - Categories et sous-categories creees avec succes.");
  } catch (err) {
    console.error("Erreur :", err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
