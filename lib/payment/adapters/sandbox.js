// lib/payment/adapters/sandbox.js
/**
 * Adaptateur sandbox : simule Mobile Money SANS clé fournisseur.
 * Parfait pour développer et tester le flux complet en local/staging.
 *
 * Simule :
 * - Une URL de paiement fictive (page /sandbox-pay)
 * - Un webhook déclenchable manuellement
 * - Des signatures simples (HMAC-SHA256 avec PAYMENT_SANDBOX_SECRET)
 */

import crypto from "crypto";

const SANDBOX_SECRET = process.env.PAYMENT_SANDBOX_SECRET;

// 🔒 Fail closed : si le secret n'est pas configuré, la sandbox est inutilisable
// (empêche un déploiement accidentel avec secret par défaut en preview/prod)
if (!SANDBOX_SECRET) {
  throw new Error(
    "PAYMENT_SANDBOX_SECRET non configuré. " +
    "Ajoutez-le dans Vercel (.env.local en local)."
  );
}

/**
 * Initie un paiement fictif.
 * L'URL renvoie vers /sandbox-pay?transaction_id=XXX
 * où un bouton "Simuler paiement réussi" déclenche le webhook.
 */
export async function initiateSandbox({
  transactionId,
  amount,
  description,
  customerPhoneNumber,
  notifyUrl,
  returnUrl,
  orderId,
}) {
  // 🔒 CORRECTION : on part de l'ORIGINE du site (pas du chemin de returnUrl)
  // sinon on obtiendrait /orders/sandbox-pay → 404
  const origin = new URL(returnUrl).origin;
  const sandboxPage = `${origin}/sandbox-pay?transaction_id=${encodeURIComponent(transactionId)}&amount=${amount}&return_url=${encodeURIComponent(returnUrl)}`;

  return {
    paymentUrl: sandboxPage,
    providerData: {
      provider: "sandbox",
      transactionId,
      amount,
      description,
      initiatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Vérifie la signature HMAC-SHA256 du webhook sandbox.
 */
export async function verifySandboxSignature(rawBody, signatureHeader) {
  if (!signatureHeader) return false;
  const payload = typeof rawBody === "string" ? rawBody : JSON.stringify(rawBody);
  const expected = crypto
    .createHmac("sha256", SANDBOX_SECRET)
    .update(payload)
    .digest("hex");

  // Constant-time comparison (protection anti-timing attack)
  try {
    if (signatureHeader.length !== expected.length) return false;
    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

/**
 * Parse l'événement webhook sandbox.
 * Attendu : { transaction_id, status, amount }
 */
export async function parseSandboxEvent(body) {
  return {
    transactionId: body.transaction_id,
    status: body.status === "success" ? "success" : "failed",
    amount: Number(body.amount),
    raw: body,
  };
}

/**
 * Helper utilitaire : génère une signature sandbox valide
 * (utilisé par /api/sandbox/simulate côté serveur)
 */
export function signSandboxPayload(payload) {
  return crypto
    .createHmac("sha256", SANDBOX_SECRET)
    .update(JSON.stringify(payload))
    .digest("hex");
}
