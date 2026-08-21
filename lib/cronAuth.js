import { timingSafeEqual } from "crypto";

/**
 * Vérifie l'en-tête Authorization d'une requête cron contre CRON_SECRET,
 * en comparaison à temps constant (protection contre les attaques par
 * timing, même si le risque réel est faible sur une route interne).
 *
 * @param {Request} request
 * @returns {boolean} true si autorisé
 */
export function isValidCronAuth(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail-closed : jamais autorisé sans secret configuré

  const auth = request.headers.get("authorization") || "";
  const expected = `Bearer ${secret}`;

  const authBuf = Buffer.from(auth);
  const expectedBuf = Buffer.from(expected);

  return authBuf.length === expectedBuf.length && timingSafeEqual(authBuf, expectedBuf);
}
