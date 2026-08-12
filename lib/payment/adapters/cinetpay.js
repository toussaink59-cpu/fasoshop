// lib/payment/adapters/cinetpay.js
/**
 * Adaptateur CinetPay : réutilise votre stub lib/cinetpay existant
 * et implémente la vérification de signature localement (HMAC-SHA256).
 *
 * Variables d'env requises :
 * - CINETPAY_API_KEY
 * - CINETPAY_SITE_ID
 * - CINETPAY_WEBHOOK_SECRET (pour vérification HMAC)
 *
 * Documentation : https://docs.cinetpay.com
 */

import crypto from "crypto";
import { initiatePayment as initiateCinetPayStub } from "@/lib/cinetpay";

export async function initiateCinetPay({
  transactionId,
  amount,
  description,
  customerPhoneNumber,
  notifyUrl,
  returnUrl,
  orderId,
}) {
  // Le stub actuel lève une erreur ; quand CinetPay sera vraiment branché,
  // cette fonction retournera une URL de paiement.
  const { paymentUrl } = await initiateCinetPayStub({
    transactionId,
    amount: Math.round(Number(amount)),
    description,
    customerPhoneNumber,
    notifyUrl,
    returnUrl,
  });

  return {
    paymentUrl,
    providerData: {
      provider: "cinetpay",
      transactionId,
      amount,
      initiatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Vérifie la signature HMAC-SHA256 du webhook CinetPay.
 * Utilise la variable d'env CINETPAY_WEBHOOK_SECRET.
 */
export async function verifyCinetPaySignature(rawBody, signatureHeader) {
  const secret = process.env.CINETPAY_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  const payload = typeof rawBody === "string" ? rawBody : JSON.stringify(rawBody);
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  // Constant-time comparison pour éviter les attaques timing
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

/**
 * Parse l'événement webhook CinetPay.
 * CinetPay envoie typiquement :
 * { cpm_trans_id, cpm_status, cpm_amount, ... }
 */
export async function parseCinetPayEvent(body) {
  const statusMap = {
    "00": "success",     // CinetPay : 00 = succès
    "01": "failed",      // échec
    SUCCESS: "success",
    success: "success",
    FAILED: "failed",
    failed: "failed",
  };
  const status = statusMap[body.cpm_status] || "failed";

  return {
    transactionId: body.cpm_trans_id,
    status,
    amount: Number(body.cpm_amount),
    raw: body,
  };
}
