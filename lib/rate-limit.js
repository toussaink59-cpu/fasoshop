// lib/rate-limit.js
import rateLimitPackage from 'express-rate-limit';

// Fonction utilitaire pour générer une clé unique par client
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

// Wrapper simple pour Next.js App Router
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

// Helper pour adapter express-rate-limit à Next.js (CORRIGÉ)
export function createNextRateLimit(limiter) {
  return async (req, res, next) => {
    const mockReq = {
      ip: req.headers?.get('x-forwarded-for')?.split(',')[0] || null,
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
        
        const remaining = mockRes.getHeader('X-RateLimit-Remaining');
        if (remaining && parseInt(remaining, 10) < 0) {
          resolve(new Response(JSON.stringify({ error: 'Trop de requêtes.' }), {
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
