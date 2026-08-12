// lib/payment/adapters/ligdicash.js
/**
 * Adaptateur Ligdicash (Burkina Faso, Togo, Bénin).
 *
 * Variables d'env requises :
 * - LIGDICASH_API_KEY
 * - LIGDICASH_API_USER
 * - LIGDICASH_WEBHOOK_SECRET
 * - LIGDICASH_MODE  ('test' ou 'live')
 *
 * Documentation : https://ligdicash.com/api/docs
 */

const LIGDICASH_BASE_URLS = {
  test: "https://api.ligdicash.com/api/v1",
  live: "https://api.ligdicash.com/api/v1",
};

import crypto from "crypto";

export async function initiateLigdicash({
  transactionId,
  amount,
  description,
  customerPhoneNumber,
  notifyUrl,
  returnUrl,
  orderId,
}) {
  const apiKey = process.env.LIGDICASH_API_KEY;
  const apiUser = process.env.LIGDICASH_API_USER;
  const mode = (process.env.LIGDICASH_MODE || "test").toLowerCase();

  if (!apiKey || !apiUser) {
    throw new Error("Clés Ligdicash manquantes (LIGDICASH_API_KEY / LIGDICASH_API_USER)");
  }

  const baseUrl = LIGDICASH_BASE_URLS[mode] || LIGDICASH_BASE_URLS.test;

  // Format téléphone : retirer espaces/tirets, garder seulement chiffres
  const cleanPhone = (customerPhoneNumber || "").replace(/[^\d+]/g, "");

  const response = await fetch(`${baseUrl}/payments/initiate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
      "X-API-USER": apiUser,
    },
    body: JSON.stringify({
      amount: Math.round(Number(amount)),
      currency: "XOF",
      description,
      notify_url: notifyUrl,
      return_url: returnUrl,
      customer: { phone: cleanPhone },
      merchant_transaction_id: transactionId,
      metadata: { order_id: orderId },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ligdicash initiation failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  return {
    paymentUrl: data.payment_url || data.redirect_url,
    providerData: {
      provider: "ligdicash",
      transactionId,
      providerTransactionId: data.transaction_id,
      amount,
      initiatedAt: new Date().toISOString(),
    },
  };
}

export async function verifyLigdicashSignature(rawBody, signatureHeader) {
  const secret = process.env.LIGDICASH_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(typeof rawBody === "string" ? rawBody : JSON.stringify(rawBody))
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

export async function parseLigdicashEvent(body) {
  const statusMap = {
    completed: "success",
    success: "success",
    paid: "success",
    failed: "failed",
    expired: "failed",
    cancelled: "failed",
  };
  const status = statusMap[(body.status || "").toLowerCase()] || "failed";

  return {
    transactionId: body.merchant_transaction_id || body.transaction_id,
    status,
    amount: Number(body.amount),
    raw: body,
  };
}
