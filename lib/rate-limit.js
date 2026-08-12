// lib/rate-limit.js
// Système de rate-limit éprouvé sur 10+ routes (login, orders, stock, payouts...)
// Utilise une Map globale en mémoire (suffisant pour Vercel Hobby mono-instance)
//
// 🔧 VAGUE 2 : clientKey() retourne maintenant l'IP SEULE (plus stricte).
// Avant : IP::User-Agent → contournable en changeant de navigateur
// Après : IP seule → plus sécurisée + cohérente avec forensic logs
//
// Helpers explicites ajoutés :
// - clientIP(req) : IP seule (pour ip_address des logs)
// - clientUA(req) : User-Agent seul (pour user_agent des logs)

/**
 * Extrait l'IP client depuis la requête.
 * Gère x-forwarded-for (Vercel) et fallback connexion directe.
 * @param {Request|object} req
 * @returns {string}
 */
export const clientIP = (req) => {
  if (req.headers && typeof req.headers.get === 'function') {
    // Next.js App Router (Request standard)
    return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
      || req.headers.get('x-real-ip')
      || 'unknown';
  }
  // Fallback Node.js classique
  return req.ip || req.connection?.remoteAddress || 'unknown';
};

/**
 * Extrait le User-Agent depuis la requête.
 * @param {Request|object} req
 * @returns {string}
 */
export const clientUA = (req) => {
  if (req.headers && typeof req.headers.get === 'function') {
    return req.headers.get('user-agent') || 'unknown';
  }
  return req.headers?.['user-agent'] || 'unknown';
};

/**
 * Clé de rate-limit : IP seule.
 * Plus stricte que l'ancienne version (IP::UA) — empêche le contournement
 * par changement de User-Agent.
 * @param {Request|object} req
 * @returns {string}
 */
export const clientKey = (req) => clientIP(req);

/**
 * Rate-limit simple pour Next.js App Router
 * @param {string} key - Clé unique (ex: `login:email@example.com`)
 * @param {object} options - { limit: 5, windowMs: 60000 }
 * @returns {boolean} true si autorisé, false si bloqué
 *
 * Exemple d'utilisation :
 * if (!rateLimit(`login:${email}`, { limit: 8, windowMs: 60000 })) {
 *   return Response.json({ error: "Trop de tentatives." }, { status: 429 });
 * }
 */
export const rateLimit = (key, options = {}) => {
  const limit = options.limit || 5;
  const windowMs = options.windowMs || 60000;

  if (!global.rateLimitStore) {
    global.rateLimitStore = new Map();
  }

  const now = Date.now();
  const record = global.rateLimitStore.get(key) || { count: 0, resetTime: now + windowMs };

  if (now > record.resetTime) {
    record.count = 0;
    record.resetTime = now + windowMs;
  }

  record.count++;
  global.rateLimitStore.set(key, record);

  return record.count <= limit;
};
