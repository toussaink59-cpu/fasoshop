// lib/payment/provider.js
/**
 * Interface unique pour tous les fournisseurs de paiement.
 * Permet de switcher entre Ligdicash / CinetPay / Sandbox en changeant
 * UNE seule variable d'environnement : PAYMENT_PROVIDER
 *
 * Chaque adaptateur doit exposer :
 * - initiate(params) → { paymentUrl, providerData }
 * - verifyWebhookSignature(req, rawBody, signature) → boolean
 * - parseWebhookEvent(body) → { transactionId, status, amount, raw }
 */

import { initiateLigdicash, verifyLigdicashSignature, parseLigdicashEvent } from "./adapters/ligdicash";
import { initiateCinetPay, verifyCinetPaySignature, parseCinetPayEvent } from "./adapters/cinetpay";
import { initiateSandbox, verifySandboxSignature, parseSandboxEvent } from "./adapters/sandbox";

const PROVIDERS = {
  ligdicash: {
    initiate: initiateLigdicash,
    verifyWebhookSignature: verifyLigdicashSignature,
    parseWebhookEvent: parseLigdicashEvent,
  },
  cinetpay: {
    initiate: initiateCinetPay,
    verifyWebhookSignature: verifyCinetPaySignature,
    parseWebhookEvent: parseCinetPayEvent,
  },
  sandbox: {
    initiate: initiateSandbox,
    verifyWebhookSignature: verifySandboxSignature,
    parseWebhookEvent: parseSandboxEvent,
  },
};

/**
 * Retourne l'adaptateur actif selon la variable d'env.
 * Défaut : 'sandbox' (sécurisé : on ne tombe jamais en production sans le vouloir)
 */
export function getProvider() {
  const name = (process.env.PAYMENT_PROVIDER || "sandbox").toLowerCase();
  const adapter = PROVIDERS[name];
  if (!adapter) {
    throw new Error(`Fournisseur de paiement inconnu : ${name}`);
  }
  return { name, adapter };
}
