// lib/rate-limit.js
// Rate-limit distribué via Upstash Redis (anciennement Vercel KV) avec fallback mémoire en dev.
//
// Backend Upstash Redis :
// - Clé `rl:{key}` avec TTL en secondes
// - INCR atomique + EXPIRE sur le premier appel
// - Partagé entre toutes les instances Vercel (scale-out)
//
// Fallback mémoire (dev / Redis non configuré) :
// - Map globale conservée pour compatibilité locale
//
// API : async rateLimit(key, { limit, windowMs }) → Promise<boolean>

import { kv } from "@vercel/kv";

export const clientIP = (req) => {
  if (req.headers && typeof req.headers.get === "function") {
    return (req.headers.get("x-forwarded-for") || "").split(",")[0].trim()
      || req.headers.get("x-real-ip")
      || "unknown";
  }
  return req.ip || req.connection?.remoteAddress || "unknown";
};

export const clientUA = (req) => {
  if (req.headers && typeof req.headers.get === "function") {
    return req.headers.get("user-agent") || "unknown";
  }
  return req.headers?.["user-agent"] || "unknown";
};

export const clientKey = (req) => clientIP(req);

/**
 * Rate-limit distribué (async).
 * Utilise Upstash Redis si configuré, sinon Map mémoire.
 * @param {string} key - Clé unique (ex: "login:email@example.com")
 * @param {object} options - { limit: 5, windowMs: 60000 }
 * @returns {Promise<boolean>} true si autorisé, false si bloqué
 */
export async function rateLimit(key, options = {}) {
  const limit = options.limit || 5;
  const windowMs = options.windowMs || 60000;
  const windowSec = Math.ceil(windowMs / 1000);

  // Fallback mémoire si Redis non configuré (dev local)
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    if (!global.rateLimitStore) global.rateLimitStore = new Map();
    const now = Date.now();
    const record = global.rateLimitStore.get(key) || { count: 0, resetTime: now + windowMs };
    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + windowMs;
    }
    record.count++;
    global.rateLimitStore.set(key, record);
    return record.count <= limit;
  }

  // Backend Upstash Redis (via @vercel/kv)
  try {
    const fullKey = `rl:${key}`;
    const current = await kv.incr(fullKey);
    if (current === 1) {
      await kv.expire(fullKey, windowSec);
    }
    return current <= limit;
  } catch (err) {
    // Fail open : si Redis tombe, on ne bloque pas les utilisateurs
    console.error("[rateLimit] Redis error, fail open:", err.message);
    return true;
  }
}
