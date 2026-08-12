// lib/queries/products.js
import sql from "@/lib/db";

/**
 * Parse les images JSONB depuis la base de données.
 * @param {Array|string} images - Images JSONB ou string JSON
 * @returns {Array} Tableau d'images
 */
export function parseImages(images) {
  if (Array.isArray(images)) return images;
  if (typeof images === "string") {
    try {
      return JSON.parse(images);
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Clauses de tri pour les produits.
 * Chaque fonction retourne une clause SQL ORDER BY.
 */
const SORT_CLAUSES = {
  newest: (sql) => sql`p.created_at DESC`,
  price_asc: (sql) => sql`p.price ASC`,
  price_desc: (sql) => sql`p.price DESC`,
  rating: (sql) => sql`avg_rating DESC NULLS LAST, p.created_at DESC`,
};

/**
 * Valide et caste les paramètres de filtrage.
 * @param {object} filters - Paramètres bruts depuis query string
 * @returns {object} Paramètres validés et castés
 * @throws {Error} Si un paramètre est invalide
 */
function validateFilters(filters) {
  const validated = {};

  // categorySlug : string ou null
  validated.categorySlug = filters.categorySlug?.trim() || null;

  // q : recherche texte, max 100 caractères
  if (filters.q) {
    const q = filters.q.trim();
    if (q.length > 100) {
      throw new Error("Le paramètre 'q' ne peut pas dépasser 100 caractères.");
    }
    validated.q = q;
  } else {
    validated.q = null;
  }

  // minPrice : nombre >= 0
  if (filters.minPrice !== null && filters.minPrice !== undefined) {
    const minPrice = parseFloat(filters.minPrice);
    if (isNaN(minPrice) || minPrice < 0) {
      throw new Error("Le paramètre 'minPrice' doit être un nombre >= 0.");
    }
    validated.minPrice = minPrice;
  } else {
    validated.minPrice = null;
  }

  // maxPrice : nombre >= minPrice
  if (filters.maxPrice !== null && filters.maxPrice !== undefined) {
    const maxPrice = parseFloat(filters.maxPrice);
    if (isNaN(maxPrice) || maxPrice < 0) {
      throw new Error("Le paramètre 'maxPrice' doit être un nombre >= 0.");
    }
    if (validated.minPrice !== null && maxPrice < validated.minPrice) {
      throw new Error("Le paramètre 'maxPrice' doit être >= 'minPrice'.");
    }
    validated.maxPrice = maxPrice;
  } else {
    validated.maxPrice = null;
  }

  // shopId : entier positif
  if (filters.shopId !== null && filters.shopId !== undefined) {
    const shopId = parseInt(filters.shopId, 10);
    if (isNaN(shopId) || shopId <= 0) {
      throw new Error("Le paramètre 'shopId' doit être un entier positif.");
    }
    validated.shopId = shopId;
  } else {
    validated.shopId = null;
  }

  // condition : neuf|quasi_neuf|occasion
  const validConditions = ["neuf", "quasi_neuf", "occasion"];
  if (filters.condition) {
    if (!validConditions.includes(filters.condition)) {
      throw new Error("Le paramètre 'condition' doit être 'neuf', 'quasi_neuf' ou 'occasion'.");
    }
    validated.condition = filters.condition;
  } else {
    validated.condition = null;
  }

  // brand : string ou null
  validated.brand = filters.brand?.trim() || null;

  // city : string ou null
  validated.city = filters.city?.trim() || null;

  // minRating : 1-5
  if (filters.minRating !== null && filters.minRating !== undefined) {
    const minRating = parseFloat(filters.minRating);
    if (isNaN(minRating) || minRating < 1 || minRating > 5) {
      throw new Error("Le paramètre 'minRating' doit être entre 1 et 5.");
    }
    validated.minRating = minRating;
  } else {
    validated.minRating = null;
  }

  // sort : newest|price_asc|price_desc|rating
  const validSorts = ["newest", "price_asc", "price_desc", "rating"];
  validated.sort = validSorts.includes(filters.sort) ? filters.sort : "newest";

  return validated;
}

/**
 * Récupère les produits du catalogue public avec pagination cursor-based.
 * 
 * @param {object} filters - Filtres de recherche
 * @param {string|null} filters.categorySlug - Slug de catégorie
 * @param {string|null} filters.q - Texte de recherche
 * @param {number|null} filters.minPrice - Prix minimum
 * @param {number|null} filters.maxPrice - Prix maximum
 * @param {number|null} filters.shopId - ID de boutique
 * @param {string|null} filters.condition - État du produit
 * @param {string|null} filters.brand - Marque
 * @param {string|null} filters.city - Ville de la boutique
 * @param {number|null} filters.minRating - Note minimum (1-5)
 * @param {string} filters.sort - Tri (newest|price_asc|price_desc|rating)
 * @param {number} limit - Nombre de produits par page (défaut 24, max 100)
 * @param {string|null} cursor - Cursor pour pagination (created_at du dernier produit)
 * @param {number|string|null} userId - ID utilisateur pour calculer is_favorited
 * 
 * @returns {Promise<{products: Array, nextCursor: string|null, hasMore: boolean, total: number}>}
 */
export async function getProducts(
  filters = {},
  limit = 24,
  cursor = null,
  userId = null
) {
  // Validation stricte des paramètres
  const validated = validateFilters(filters);
  const {
    categorySlug,
    q,
    minPrice,
    maxPrice,
    shopId,
    condition,
    brand,
    city,
    minRating,
    sort,
  } = validated;

  // Limite : 1-100, défaut 24
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 24, 1), 100);

  // Clé de tri
  const sortKey = SORT_CLAUSES[sort] ? sort : "newest";

  // Comptage global des produits correspondant aux filtres
  const [countResult] = await sql`
    SELECT COUNT(*)::int AS total
    FROM products p
    JOIN shops s ON s.id = p.shop_id
    LEFT JOIN (
      SELECT product_id, AVG(rating)::numeric(2,1) AS avg_rating
      FROM reviews
      GROUP BY product_id
    ) r ON r.product_id = p.id
    WHERE p.status = 'active'
      AND s.status = 'active'
      AND p.stock_quantity > 0
      AND (${categorySlug}::text IS NULL OR p.category_id IN (
        SELECT id FROM categories
        WHERE slug = ${categorySlug}
           OR parent_id = (SELECT id FROM categories WHERE slug = ${categorySlug})
      ))
      AND (${q}::text IS NULL OR p.name ILIKE ${q ? `%${q}%` : null})
      AND (${minPrice}::numeric IS NULL OR p.price >= ${minPrice}::numeric)
      AND (${maxPrice}::numeric IS NULL OR p.price <= ${maxPrice}::numeric)
      AND (${shopId}::int IS NULL OR s.id = ${shopId}::int)
      AND (${condition}::text IS NULL OR p.condition = ${condition})
      AND (${brand}::text IS NULL OR p.brand = ${brand})
      AND (${city}::text IS NULL OR s.city = ${city})
      AND (${minRating}::numeric IS NULL OR COALESCE(r.avg_rating, 0) >= ${minRating}::numeric)
  `;
  const total = countResult?.total || 0;

  // Récupération des produits avec pagination cursor-based
  const products = await sql`
    SELECT p.id, p.name, p.description, p.price, p.compare_at_price, p.stock_quantity, p.images, p.condition,
           p.brand, p.created_at,
           (p.is_sponsored AND p.sponsored_until > NOW()) AS is_sponsored,
           s.id AS shop_id, s.name AS shop_name, s.city AS shop_city,
           (s.verified_at IS NOT NULL) AS shop_verified,
           c.name AS category_name, c.slug AS category_slug,
           COALESCE(r.avg_rating, 0) AS avg_rating, COALESCE(r.review_count, 0) AS review_count,
           (${userId}::int IS NOT NULL AND EXISTS (
             SELECT 1 FROM favorites f WHERE f.product_id = p.id AND f.user_id = ${userId}::int
           )) AS is_favorited
    FROM products p
    JOIN shops s ON s.id = p.shop_id
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN (
      SELECT product_id, AVG(rating)::numeric(2,1) AS avg_rating, COUNT(*)::int AS review_count
      FROM reviews
      GROUP BY product_id
    ) r ON r.product_id = p.id
    WHERE p.status = 'active'
      AND s.status = 'active'
      AND p.stock_quantity > 0
      AND (${cursor}::timestamptz IS NULL OR p.created_at < ${cursor}::timestamptz)
      AND (${categorySlug}::text IS NULL OR p.category_id IN (
        SELECT id FROM categories
        WHERE slug = ${categorySlug}
           OR parent_id = (SELECT id FROM categories WHERE slug = ${categorySlug})
      ))
      AND (${q}::text IS NULL OR p.name ILIKE ${q ? `%${q}%` : null})
      AND (${minPrice}::numeric IS NULL OR p.price >= ${minPrice}::numeric)
      AND (${maxPrice}::numeric IS NULL OR p.price <= ${maxPrice}::numeric)
      AND (${shopId}::int IS NULL OR s.id = ${shopId}::int)
      AND (${condition}::text IS NULL OR p.condition = ${condition})
      AND (${brand}::text IS NULL OR p.brand = ${brand})
      AND (${city}::text IS NULL OR s.city = ${city})
      AND (${minRating}::numeric IS NULL OR COALESCE(r.avg_rating, 0) >= ${minRating}::numeric)
    ORDER BY (p.is_sponsored AND p.sponsored_until > NOW()) DESC, ${SORT_CLAUSES[sortKey](sql)}, p.id DESC
    LIMIT ${safeLimit + 1}
  `;

  // Traitement des résultats
  const now = Date.now();
  const NEW_WINDOW_MS = 14 * 24 * 60 * 60 * 1000; // 14 jours

  const hasMore = products.length > safeLimit;
  const slicedProducts = hasMore ? products.slice(0, safeLimit) : products;

  const nextCursor = hasMore && slicedProducts.length > 0
    ? slicedProducts[slicedProducts.length - 1].created_at.toISOString()
    : null;

  const formattedProducts = slicedProducts.map((p) => ({
    ...p,
    images: parseImages(p.images),
    isNew: p.created_at ? now - new Date(p.created_at).getTime() < NEW_WINDOW_MS : false,
  }));

  return {
    products: formattedProducts,
    nextCursor,
    hasMore,
    total,
  };
}

/**
 * Marques distinctes utilisées par des produits actifs ET en stock.
 * @returns {Promise<string[]>} Tableau de marques
 */
export async function getBrands() {
  const rows = await sql`
    SELECT DISTINCT p.brand
    FROM products p
    JOIN shops s ON s.id = p.shop_id
    WHERE p.status = 'active'
      AND s.status = 'active'
      AND p.stock_quantity > 0
      AND p.brand IS NOT NULL
      AND p.brand != ''
    ORDER BY p.brand ASC
  `;
  return rows.map((r) => r.brand);
}
