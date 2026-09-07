/**
 * KIMOXA — Adaptateur paiement Sandbox
 *
 * Simulation Mobile Money sans fournisseur réel.
 *
 * Sécurité :
 * - PAYMENT_SANDBOX_SECRET reste côté serveur.
 * - Le navigateur ne reçoit jamais le secret.
 * - Le navigateur reçoit uniquement un capability temporaire.
 * - Les webhooks utilisent toujours HMAC-SHA256.
 */

import crypto from "crypto";
import {
  createSandboxCapability,
} from "@/lib/sandboxAuth";

const SANDBOX_SECRET =
  process.env.PAYMENT_SANDBOX_SECRET;

if (!SANDBOX_SECRET) {
  throw new Error(
    "PAYMENT_SANDBOX_SECRET non configuré. " +
      "Ajoutez-le dans l'environnement serveur."
  );
}

/**
 * Initie un paiement sandbox.
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
  const cleanTransactionId =
    String(transactionId || "").trim();

  const numericAmount =
    Number(amount);

  if (!cleanTransactionId) {
    throw new Error(
      "transactionId sandbox manquant."
    );
  }

  if (
    !Number.isFinite(numericAmount) ||
    numericAmount <= 0
  ) {
    throw new Error(
      "Montant sandbox invalide."
    );
  }

  if (!returnUrl) {
    throw new Error(
      "returnUrl sandbox manquant."
    );
  }

  const origin =
    new URL(returnUrl).origin;

  const capability =
    createSandboxCapability({
      transactionId:
        cleanTransactionId,
      amount:
        numericAmount,
    });

  const sandboxParams =
    new URLSearchParams({
      transaction_id:
        cleanTransactionId,

      amount:
        String(numericAmount),

      return_url:
        returnUrl,

      sandbox_token:
        capability,
    });

  const sandboxPage =
    `${origin}/sandbox-pay?${sandboxParams.toString()}`;

  return {
    paymentUrl:
      sandboxPage,

    providerData: {
      provider: "sandbox",

      transactionId:
        cleanTransactionId,

      amount:
        numericAmount,

      description:
        description || null,

      customerPhoneNumber:
        customerPhoneNumber || null,

      notifyUrl:
        notifyUrl || null,

      returnUrl,

      orderId:
        orderId || null,

      initiatedAt:
        new Date().toISOString(),
    },
  };
}

/**
 * Vérifie la signature HMAC-SHA256
 * d'un webhook sandbox.
 */
export async function verifySandboxSignature(
  rawBody,
  signatureHeader
) {
  if (!signatureHeader) {
    return false;
  }

  const payload =
    typeof rawBody === "string"
      ? rawBody
      : JSON.stringify(rawBody);

  const expected =
    crypto
      .createHmac(
        "sha256",
        SANDBOX_SECRET
      )
      .update(payload)
      .digest("hex");

  try {
    const received =
      String(signatureHeader);

    if (
      received.length !==
      expected.length
    ) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(received, "utf8"),
      Buffer.from(expected, "utf8")
    );
  } catch {
    return false;
  }
}

/**
 * Convertit le body du webhook
 * en événement KIMOXA standardisé.
 */
export async function parseSandboxEvent(
  body
) {
  return {
    transactionId:
      body?.transaction_id,

    status:
      body?.status === "success"
        ? "success"
        : "failed",

    amount:
      Number(body?.amount),

    raw:
      body,
  };
}

/**
 * Signature interne utilisée par
 * /api/sandbox/simulate.
 */
export function signSandboxPayload(
  payload
) {
  return crypto
    .createHmac(
      "sha256",
      SANDBOX_SECRET
    )
    .update(
      JSON.stringify(payload)
    )
    .digest("hex");
}
