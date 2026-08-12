// lib/payment/adapters/sandbox.js
/**
 * Adaptateur sandbox : simule Mobile Money SANS clé fournisseur.
 * Parfait pour développer et tester le flux complet en local/staging.
 *
 * Simule :
 * - Une URL de paiement fictive
 * - Un webhook déclenchable manuellement
 * - Des signatures simples (HMAC-SHA256 avec SECRET_SANDBOX)
 */

import crypto from "crypto";

const SANDBOX_SECRET = process.env.PAYMENT_SANDBOX_SECRET || "sandbox-dev-secret-change-me";

/**
 * Initie un paiement fictif.
 * L'URL renvoie vers une page /sandbox-pay?transaction_id=XXX
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
  // URL de test : on simule le portail Mobile Money
  const sandboxPage = `${returnUrl.split("?")[0]}/sandbox-pay?transaction_id=${encodeURIComponent(transactionId)}&amount=${amount}&return_url=${encodeURIComponent(returnUrl)}&notify_url=${encodeURIComponent(notifyUrl)}`;

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
export async function verifyWebhookSignature(rawBody, signatureHeader) {
  if (!signatureHeader) return false;
  const expected = crypto
    .createHmac("sha256", SANDBOX_SECRET)
    .update(rawBody)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signatureHeader),
    Buffer.from(expected)
  );
}
export { verifyWebhookSignature as verifySandboxSignature };

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
 * (pour vos tests curl locaux)
 */
export function signSandboxPayload(payload) {
  return crypto
    .createHmac("sha256", SANDBOX_SECRET)
    .update(JSON.stringify(payload))
    .digest("hex");
}
