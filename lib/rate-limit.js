// lib/rate-limit.js
// Système de rate-limit éprouvé sur 10+ routes (login, orders, stock, payouts...)
// Utilise une Map globale en mémoire (suffisant pour Vercel Hobby mono-instance)

/**
 * Génère une clé unique par client (IP + User-Agent)
 * Utilisée pour limiter les abus par origine
 */
export const clientKey = (req) => {
  if (req.headers && typeof req.headers.get === 'function') {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const ua = req.headers.get('user-agent') || 'unknown';
    return `${ip}::${ua}`;
  }
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const ua = req.headers?.['user-agent'] || 'unknown';
  return `${ip}::${ua}`;
};

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