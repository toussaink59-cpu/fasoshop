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
