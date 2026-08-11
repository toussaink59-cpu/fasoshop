import rateLimitPackage from 'express-rate-limit';

// Exporter la fonction principale sous le nom 'rateLimit' pour compatibilité
export const rateLimit = rateLimitPackage;

// Limiteur pour les connexions
export const loginLimiter = rateLimitPackage({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limiteur général API
export const apiLimiter = rateLimitPackage({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Trop de requêtes, veuillez ralentir' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Générateur de clé client
export const clientKey = (req) => {
  const fingerprint = req.headers['user-agent'] || 'unknown';
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  return `${ip}::${fingerprint}`;
};

// Factory personnalisée
export const createRateLimiter = (options = {}) => {
  return rateLimitPackage({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 5,
    message: options.message || { error: 'Limite dépassée' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: options.keyGenerator || clientKey,
    skip: options.skip,
  });
};
