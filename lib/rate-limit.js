import rateLimit from 'express-rate-limit';

// Limiteur pour les connexions (5 tentatives / 15 min)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limiteur général pour l'API (30 req / min)
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Trop de requêtes, veuillez ralentir' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Fonction utilitaire pour générer une clé unique par client (IP + User-Agent)
export const clientKey = (req) => {
  const fingerprint = req.headers['user-agent'] || 'unknown';
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  return `${ip}::${fingerprint}`;
};

// Factory pour créer un limiteur personnalisé
export const createRateLimiter = (options = {}) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 5,
    message: options.message || { error: 'Limite dépassée' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: options.keyGenerator || clientKey,
    skip: options.skip,
  });
};

// Export direct de la fonction rateLimit pour compatibilité
export { rateLimit as default };