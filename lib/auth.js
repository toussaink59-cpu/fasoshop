// Helpers JWT (jose) — compatibles Edge Runtime, utilisables dans middleware.js
// et dans les API routes Node.

import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET manquant — vérifie ton fichier .env.local");
}

const secretKey = new TextEncoder().encode(JWT_SECRET);
const JWT_ALG = "HS256";
const JWT_EXPIRY = "7d";

/**
 * Crée un token signé pour un utilisateur donné.
 * Payload enrichi : status (user) + shopId/shopStatus (si vendor)
 * pour permettre une vérification rapide au middleware sans requête DB.
 *
 * @param {Object} payload - { userId, role, status, shopId?, shopStatus? }
 */
export async function signToken(payload) {
  const enriched = {
    userId: payload.userId,
    role: payload.role,
    status: payload.status || "active", // sécurité : défaut safe
    tokenVersion: payload.tokenVersion || 0, // permet l'invalidation forcée (reset mdp)
  };

  // Ajoute les infos boutique uniquement pour les vendors
  if (payload.role === "vendor") {
    enriched.shopId = payload.shopId || null;
    enriched.shopStatus = payload.shopStatus || "pending";
  }

  return await new SignJWT(enriched)
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(secretKey);
}

/**
 * Vérifie et décode un token — renvoie null si invalide/expiré.
 */
export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: [JWT_ALG],
    });
    return payload;
  } catch (err) {
    return null;
  }
}

export const AUTH_COOKIE_NAME = "fasoshop_token";


/**
 * Verifie que l utilisateur a bien le role requis (re-verification en DB).
 * A utiliser pour les actions sensibles (validation paiement, modif stock, etc.).
 * 
 * @param {string} userId - ID utilisateur (x-user-id du header)
 * @param {string|string[]} requiredRole - Role(s) requis
 * @returns {Promise<{ok: boolean, user?: object, error?: string, status?: number}>}
 */
export async function requireRole(userId, requiredRole) {
  if (!userId) {
    return { ok: false, error: "Non authentifie.", status: 401 };
  }

  const sql = (await import("@/lib/db")).default;
  const [user] = await sql`
    SELECT id, email, role, status, full_name
    FROM users
    WHERE id = ${userId}
  `;

  if (!user) {
    return { ok: false, error: "Utilisateur introuvable.", status: 401 };
  }

  if (user.status !== "active") {
    return { ok: false, error: "Compte desactive.", status: 403 };
  }

  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  if (!roles.includes(user.role)) {
    return { ok: false, error: "Acces refuse.", status: 403 };
  }

  return { ok: true, user };
}
