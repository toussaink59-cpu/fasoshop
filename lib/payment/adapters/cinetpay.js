// lib/payment/adapters/cinetpay.js
/**
 * Adaptateur CinetPay : réutilise votre lib/cinetpay existante
 * en l'enveloppant dans l'interface commune.
 *
 * Variables d'env requises :
 * - CINETPAY_API_KEY
 * - CINETPAY_SITE_ID
 * - CINETPAY_WEBHOOK_SECRET
 */

import { initiatePayment, verifyNotifySignature } from "@/lib/cinetpay";

export async function initiateCinetPay({
  transactionId,
  amount,
  description,
  customerPhoneNumber,
  notifyUrl,
  returnUrl,
  orderId,
}) {
  // CinetPay attend le montant en FCFA (entier)
  const { paymentUrl } = await initiatePayment({
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
 * Adapte à la fonction existante verifyNotifySignature.
 */
export async function verifyCinetPaySignature(rawBody, signatureHeader) {
  try {
    // La fonction existante attend probablement le body parsé + signature
    const body = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
    return verifyNotifySignature(body, signatureHeader);
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
    "00": "success",   // CinetPay : 00 = succès
    SUCCESS: "success",
    success: "success",
  };
  const status = statusMap[body.cpm_status] || "failed";

  return {
    transactionId: body.cpm_trans_id,
    status,
    amount: Number(body.cpm_amount),
    raw: body,
  };
}
