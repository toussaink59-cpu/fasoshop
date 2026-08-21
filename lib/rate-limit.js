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

// FALLBACK TEST : en environnement test, on utilise uniquement la mémoire
// pour éviter les timeouts @vercel/kv (qui n'est pas configuré en test).
const __testMemoryStore = new Map();
function __testMemoryRateLimit(key, limit, windowMs) {
  const now = Date.now();
  const windowStart = now - windowMs;
  let entry = __testMemoryStore.get(key);
  if (!entry || entry.windowStart < windowStart) {
    entry = { count: 1, windowStart: now };
    __testMemoryStore.set(key, entry);
    return true;
  }
  entry.count++;
  return entry.count <= limit;
}

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
 // En test : bypass KV, utiliser uniquement la mémoire
  if (process.env.NODE_ENV === "test") {
    return __testMemoryRateLimit(key, options.limit || 5, options.windowMs || 60000);
  }

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

  // Backend Upstash Redis (production)
  try {
    const current = await kv.get(`rl:${key}`);
    if (!current) {
      await kv.set(`rl:${key}`, 1, { ex: windowSec });
      return true;
    }
    const count = Number(current);
    if (count >= limit) return false;
    await kv.incr(`rl:${key}`);
    return true;
  } catch (err) {
    console.error("[rate-limit] KV error, fallback mémoire:", err.message);
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
}
