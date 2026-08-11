// lib/rate-limit.js
import rateLimitPackage from 'express-rate-limit';

// Fonction utilitaire pour générer une clé unique par client (IP + User-Agent)
export const clientKey = (req) => {
  // Pour Next.js App Router, req peut être un objet Request ou un objet personnalisé
  if (req.headers && typeof req.headers.get === 'function') {
    // C'est un objet Request standard
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const ua = req.headers.get('user-agent') || 'unknown';
    return `${ip}::${ua}`;
  }
  // Fallback pour d'autres contextes
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const ua = req.headers?.['user-agent'] || 'unknown';
  return `${ip}::${ua}`;
};

// Wrapper simple pour utiliser express-rate-limit dans Next.js App Router
// Ce wrapper retourne true si la requête est autorisée, false sinon
export const rateLimit = (key, options = {}) => {
  const limit = options.limit || 5;
  const windowMs = options.windowMs || 60000;
  
  // On utilise un store en mémoire simple pour cet exemple
  // Dans un environnement de production avec plusieurs instances, utilisez Redis
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

// Export des limiteurs pré-configurés (optionnel, pour utilisation future)
export const loginLimiter = rateLimitPackage({
  windowMs: 30 * 60 * 1000,
  max: 5,
  message: { error: 'Trop de tentatives de connexion.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiLimiter = rateLimitPackage({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Trop de requêtes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export default rateLimitPackage;
