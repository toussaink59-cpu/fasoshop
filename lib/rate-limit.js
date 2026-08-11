// Rate limiting middleware pour Next.js API routes
// Compatible avec Edge et Node runtimes

import { rateLimit } from 'express-rate-limit';

// Configuration de base pour les routes d'authentification
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requêtes par fenêtre
  message: { error: 'Trop de tentatives. Veuillez réessayer dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Utiliser l'IP ou un identifiant anonyme
    return req.ip || req.headers['x-forwarded-for'] || 'anonymous';
  },
});

// Configuration plus stricte pour le login
export const loginLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 5, // 5 tentatives de connexion
  message: { error: 'Trop de tentatives de connexion. Veuillez réessayer dans 30 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Ne pas compter les succès
  keyGenerator: (req) => {
    return req.ip || req.headers['x-forwarded-for'] || 'anonymous';
  },
});

// Configuration pour l'inscription
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 3, // 3 inscriptions par heure
  message: { error: 'Trop de tentatives d\'inscription. Veuillez réessayer dans 1 heure.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.headers['x-forwarded-for'] || 'anonymous';
  },
});

// Configuration générale pour les autres routes API
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requêtes par minute
  message: { error: 'Trop de requêtes. Veuillez ralentir.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.headers['x-forwarded-for'] || 'anonymous';
  },
});

// Helper pour adapter express-rate-limit à Next.js
export function createNextRateLimit(limiter) {
  return async (req, res, next) => {
    // Adapter l'objet Request Next.js vers quelque chose que express-rate-limit comprend
    const mockReq = {
      ip: req.ip || req.headers?.get('x-forwarded-for') || null,
      headers: req.headers,
    };
    
    const mockRes = {
      statusCode: 200,
      setHeader: (key, value) => {
        if (res.headers) {
          res.headers.set(key, value);
        }
      },
      getHeader: (key) => {
        if (res.headers) {
          return res.headers.get(key);
        }
        return null;
      },
    };

    return new Promise((resolve, reject) => {
      limiter(mockReq, mockRes, (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Vérifier si le rate limit a été atteint
        const remaining = mockRes.getHeader('X-RateLimit-Remaining');
        if (remaining && parseInt(remaining, 10) < 0) {
          resolve(new Response(JSON.stringify({ error: 'Trop de requêtes. Veuillez ralentir.' }), {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': mockRes.getHeader('Retry-After') || '60',
            },
          }));
        } else {
          resolve(null);
        }
      });
    });
  };
}
