// lib/pagination.js
// P2-13 (enhancement) : helper de pagination commun pour routes admin

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

/**
 * Parse les paramètres de pagination depuis une URL.
 * @param {URL|string} urlOrRequest - URL ou Request object
 * @returns {{ page: number, limit: number, offset: number }}
 */
export function parsePagination(urlOrRequest) {
  const url = typeof urlOrRequest === "string" 
    ? new URL(urlOrRequest) 
    : urlOrRequest instanceof URL 
      ? urlOrRequest 
      : new URL(urlOrRequest.url);

  const page = Math.max(Number(url.searchParams.get("page")) || 1, 1);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Calcule les métadonnées de pagination.
 * @param {number} page - Page courante
 * @param {number} limit - Items par page
 * @param {number} total - Total d'items
 * @returns {{ page: number, limit: number, total: number, hasNext: boolean, hasPrev: boolean, totalPages: number }}
 */
export function buildPaginationMeta(page, limit, total) {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    hasNext: page < totalPages,
    hasPrev: page > 1,
    totalPages,
  };
}
