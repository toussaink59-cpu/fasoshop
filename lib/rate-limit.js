import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 tentatives
  message: { error: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requêtes
  message: { error: 'Trop de requêtes, veuillez ralentir' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const createRateLimiter = (options = {}) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 5,
    message: options.message || { error: 'Limite dépassée' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: options.skip,
  });
};
