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

// Crée un token signé pour un utilisateur donné
export async function signToken(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(secretKey);
}

// Vérifie et décode un token — renvoie null si invalide/expiré
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
