-- 028_fulltext_search.sql
-- Index GIN full-text pour recherche rapide et scoring pertinent.
-- Recherche dans : nom (poids fort), marque (poids moyen), description (poids faible).

-- 1. Colonne tsvector materialisee (maintenue par trigger)
ALTER TABLE products ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2. Fonction de mise a jour du tsvector (ponderee)
CREATE OR REPLACE FUNCTION products_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('french', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('french', COALESCE(NEW.brand, '')), 'B') ||
    setweight(to_tsvector('french', COALESCE(NEW.description, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger BEFORE INSERT/UPDATE
DROP TRIGGER IF EXISTS trg_products_search_vector ON products;
CREATE TRIGGER trg_products_search_vector
  BEFORE INSERT OR UPDATE OF name, brand, description ON products
  FOR EACH ROW EXECUTE FUNCTION products_search_vector_update();

-- 4. Backfill pour les produits existants
UPDATE products SET search_vector =
  setweight(to_tsvector('french', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('french', COALESCE(brand, '')), 'B') ||
  setweight(to_tsvector('french', COALESCE(description, '')), 'C');

-- 5. Index GIN pour recherche ultra rapide
CREATE INDEX IF NOT EXISTS idx_products_search_vector ON products USING GIN (search_vector);
