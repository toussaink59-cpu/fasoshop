/**
 * KIMOXA — Autorisation Sandbox
 *
 * Le secret PAYMENT_SANDBOX_SECRET reste strictement côté serveur.
 *
 * Le navigateur reçoit uniquement un capability temporaire signé HMAC.
 * Ce capability est lié à :
 * - transactionId
 * - amount
 * - expiration
 * - nonce
 */

import crypto from "crypto";

const SANDBOX_SECRET =
  process.env.PAYMENT_SANDBOX_SECRET || "";

const CAPABILITY_TTL_SECONDS = 10 * 60;
const CAPABILITY_VERSION = "v1";
const CAPABILITY_PREFIX = "kimoxa-sandbox";

function encodePayload(payload) {
  return Buffer.from(
    JSON.stringify(payload),
    "utf8"
  ).toString("base64url");
}

function decodePayload(value) {
  return JSON.parse(
    Buffer.from(
      value,
      "base64url"
    ).toString("utf8")
  );
}

function signPayload(encodedPayload) {
  if (!SANDBOX_SECRET) {
    throw new Error(
      "PAYMENT_SANDBOX_SECRET non configuré."
    );
  }

  return crypto
    .createHmac(
      "sha256",
      SANDBOX_SECRET
    )
    .update(
      `${CAPABILITY_PREFIX}:${CAPABILITY_VERSION}:${encodedPayload}`
    )
    .digest("base64url");
}

/**
 * Génère un capability temporaire lié à une transaction.
 */
export function createSandboxCapability({
  transactionId,
  amount,
}) {
  if (!SANDBOX_SECRET) {
    throw new Error(
      "PAYMENT_SANDBOX_SECRET non configuré."
    );
  }

  const cleanTransactionId =
    String(transactionId || "").trim();

  const numericAmount =
    Number(amount);

  if (!cleanTransactionId) {
    throw new Error(
      "transactionId requis pour la sandbox."
    );
  }

  if (
    !Number.isFinite(numericAmount) ||
    numericAmount <= 0
  ) {
    throw new Error(
      "Montant invalide pour la sandbox."
    );
  }

  const now =
    Math.floor(Date.now() / 1000);

  const payload = {
    v: CAPABILITY_VERSION,
    transactionId: cleanTransactionId,
    amount: numericAmount,
    iat: now,
    exp: now + CAPABILITY_TTL_SECONDS,
    nonce: crypto.randomBytes(16).toString("hex"),
  };

  const encoded =
    encodePayload(payload);

  const signature =
    signPayload(encoded);

  return `${encoded}.${signature}`;
}

/**
 * Vérifie un capability sandbox.
 */
export function verifySandboxCapability({
  token,
  transactionId,
  amount,
}) {
  if (
    !SANDBOX_SECRET ||
    !token
  ) {
    return false;
  }

  try {
    const parts =
      String(token).split(".");

    if (parts.length !== 2) {
      return false;
    }

    const [
      encodedPayload,
      providedSignature,
    ] = parts;

    if (
      !encodedPayload ||
      !providedSignature
    ) {
      return false;
    }

    const expectedSignature =
      signPayload(encodedPayload);

    const providedBuffer =
      Buffer.from(
        providedSignature,
        "utf8"
      );

    const expectedBuffer =
      Buffer.from(
        expectedSignature,
        "utf8"
      );

    if (
      providedBuffer.length !==
      expectedBuffer.length
    ) {
      return false;
    }

    if (
      !crypto.timingSafeEqual(
        providedBuffer,
        expectedBuffer
      )
    ) {
      return false;
    }

    const payload =
      decodePayload(encodedPayload);

    if (
      payload?.v !== CAPABILITY_VERSION ||
      !payload?.transactionId ||
      !payload?.nonce ||
      !Number.isFinite(payload?.amount) ||
      !Number.isFinite(payload?.iat) ||
      !Number.isFinite(payload?.exp)
    ) {
      return false;
    }

    const now =
      Math.floor(Date.now() / 1000);

    if (
      payload.exp < now
    ) {
      return false;
    }

    if (
      payload.iat > now + 30
    ) {
      return false;
    }

    if (
      payload.exp - payload.iat >
      CAPABILITY_TTL_SECONDS
    ) {
      return false;
    }

    if (
      payload.transactionId !==
      String(transactionId || "").trim()
    ) {
      return false;
    }

    if (
      Number(payload.amount) !==
      Number(amount)
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
