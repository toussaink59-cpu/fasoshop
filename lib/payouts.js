// =====================================================
// KIMOXA PAYOUTS — Mobile Money
//
// Principes :
// 1. Validation stricte
// 2. Idempotence déterministe
// 3. Protection contre les courses concurrentes
// 4. Aucun fallback silencieux
// 5. Une erreur réseau = état incertain, jamais "failed"
// 6. Aucune référence fournisseur inventée
// 7. Retour minimal
// 8. Timeout obligatoire
// 9. Vérification du statut avant toute nouvelle tentative
// =====================================================

import sql from "@/lib/db";

const PAYOUT_ENDPOINT =
  process.env.CINETPAY_PAYOUT_URL ||
  "https://api-checkout.cinetpay.com/v2/payout";

const STATUS_ENDPOINT =
  process.env.CINETPAY_PAYOUT_STATUS_URL ||
  "https://api-checkout.cinetpay.com/v2/payout/status";

const TIMEOUT_MS = 20_000;

export const MIN_PAYOUT = 100;
export const MAX_PAYOUT = 5_000_000;

const ALLOWED_PROVIDERS = new Set([
  "orange_money",
  "moov_money",
]);

const FINAL_SUCCESS_STATUSES = new Set([
  "success",
  "completed",
  "paid",
]);

const FINAL_FAILURE_STATUSES = new Set([
  "failed",
  "rejected",
  "cancelled",
]);

const ACCEPTED_STATUSES = new Set([
  "accepted",
  "processing",
]);

// =====================================================
// MODE
// =====================================================

export function payoutMode() {
  return process.env.PAYOUT_MODE === "auto"
    ? "auto"
    : "manual";
}

// =====================================================
// VALIDATION
// =====================================================

function normalizePhoneBF(phone) {
  const digits = String(phone || "")
    .replace(/[\s.\-()]/g, "");

  const match = digits.match(
    /^(?:\+226|00226)?(\d{8})$/
  );

  if (!match) return null;

  const local = match[1];

  // Burkina Faso : numéros commençant par 6 ou 7
  if (!/^[67]\d{7}$/.test(local)) {
    return null;
  }

  return local;
}

export function validatePayout({
  amount,
  phone,
  provider,
}) {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    return {
      ok: false,
      error: "Montant invalide.",
    };
  }

  if (!Number.isInteger(numericAmount)) {
    return {
      ok: false,
      error:
        "Le montant doit être un nombre entier en FCFA.",
    };
  }

  if (numericAmount < MIN_PAYOUT) {
    return {
      ok: false,
      error:
        `Montant minimum : ${MIN_PAYOUT} FCFA.`,
    };
  }

  if (numericAmount > MAX_PAYOUT) {
    return {
      ok: false,
      error:
        `Montant maximum : ${MAX_PAYOUT.toLocaleString(
          "fr-FR"
        )} FCFA.`,
    };
  }

  if (!ALLOWED_PROVIDERS.has(provider)) {
    return {
      ok: false,
      error:
        "Réseau Mobile Money non pris en charge.",
    };
  }

  const phoneLocal = normalizePhoneBF(phone);

  if (!phoneLocal) {
    return {
      ok: false,
      error:
        "Numéro Mobile Money BF invalide.",
    };
  }

  return {
    ok: true,
    amount: numericAmount,
    phoneLocal,
    provider,
  };
}

// =====================================================
// UTILITAIRES
// =====================================================

function buildIdempotencyKey(
  resourceType,
  resourceId,
  version
) {
  return `${resourceType}-${resourceId}-v${version}`;
}

function getVersionFromKey(key) {
  const match = String(key || "").match(
    /-v(\d+)$/
  );

  return match ? Number(match[1]) : null;
}

function normalizeResourcePart(value) {
  const normalized =
    String(value || "").trim();

  if (!normalized) {
    throw new Error(
      "resourceType/resourceId requis."
    );
  }

  if (
    !/^[a-zA-Z0-9_-]+$/.test(normalized)
  ) {
    throw new Error(
      "Identifiant de ressource invalide."
    );
  }

  return normalized;
}

// =====================================================
// PRÉPARATION D'UNE TENTATIVE
//
// Une contrainte UNIQUE sur idempotency_key doit exister
// dans PostgreSQL.
//
// Le verrou advisory transactionnel protège la ressource
// contre deux prepareAttempt() simultanés.
// =====================================================

export async function prepareAttempt({
  resourceType,
  resourceId,
  amount,
  phone,
  provider,
}) {
  const resourceTypeSafe =
    normalizeResourcePart(resourceType);

  const resourceIdSafe =
    normalizeResourcePart(resourceId);

  const validation = validatePayout({
    amount,
    phone,
    provider,
  });

  if (!validation.ok) {
    return validation;
  }

  const {
    amount: validAmount,
    phoneLocal,
    provider: validProvider,
  } = validation;

  return sql.begin(async (tx) => {
    // Verrou logique de la ressource.
    // Le verrou est automatiquement libéré au COMMIT/ROLLBACK.
    await tx`
      SELECT pg_advisory_xact_lock(
        hashtext(${resourceTypeSafe}),
        hashtext(${resourceIdSafe})
      )
    `;

    const [latest] = await tx`
      SELECT *
      FROM payout_attempts
      WHERE resource_type = ${resourceTypeSafe}
        AND resource_id = ${resourceIdSafe}
      ORDER BY id DESC
      LIMIT 1
      FOR UPDATE
    `;

    // -------------------------------------------------
    // Déjà payé
    // -------------------------------------------------

    if (latest?.status === "succeeded") {
      return {
        canSend: false,
        reason: "already_paid",
        attempt: latest,
      };
    }

    // -------------------------------------------------
    // Tentative en cours / ambiguë
    // -------------------------------------------------

    if (
      latest?.status === "pending" ||
      latest?.status === "unconfirmed"
    ) {
      return {
        canSend: false,
        reason: "check_status",
        attempt: latest,
      };
    }

    // -------------------------------------------------
    // Nouvelle tentative
    // -------------------------------------------------

    let version = 1;

    if (latest) {
      const previousVersion =
        getVersionFromKey(
          latest.idempotency_key
        );

      if (!previousVersion) {
        throw new Error(
          "Impossible de déterminer la version de la tentative."
        );
      }

      version = previousVersion + 1;
    }

    const idempotencyKey =
      buildIdempotencyKey(
        resourceTypeSafe,
        resourceIdSafe,
        version
      );

    const [attempt] = await tx`
      INSERT INTO payout_attempts (
        idempotency_key,
        resource_type,
        resource_id,
        amount,
        phone,
        provider,
        status,
        created_at,
        updated_at
      )
      VALUES (
        ${idempotencyKey},
        ${resourceTypeSafe},
        ${resourceIdSafe},
        ${validAmount},
        ${phoneLocal},
        ${validProvider},
        'pending',
        NOW(),
        NOW()
      )
      RETURNING *
    `;

    return {
      canSend: true,
      attempt,
      idempotencyKey,
    };
  });
}

// =====================================================
// MISE À JOUR DES ÉTATS
// =====================================================

export async function markSucceeded(
  idempotencyKey,
  reference
) {
  if (!idempotencyKey) {
    throw new Error(
      "Idempotency key manquante."
    );
  }

  if (!reference) {
    throw new Error(
      "Une référence fournisseur est obligatoire pour succeeded."
    );
  }

  const result = await sql`
    UPDATE payout_attempts
    SET
      status = 'succeeded',
      provider_reference = ${String(reference)},
      error_message = NULL,
      updated_at = NOW()
    WHERE idempotency_key = ${idempotencyKey}
    RETURNING id
  `;

  if (!result.length) {
    throw new Error(
      "Tentative de payout introuvable."
    );
  }
}

export async function markFailed(
  idempotencyKey,
  message
) {
  if (!idempotencyKey) {
    throw new Error(
      "Idempotency key manquante."
    );
  }

  await sql`
    UPDATE payout_attempts
    SET
      status = 'failed',
      error_message = ${String(
        message ||
          "Échec fournisseur."
      ).slice(0, 500)},
      updated_at = NOW()
    WHERE idempotency_key = ${idempotencyKey}
  `;
}

export async function markUnconfirmed(
  idempotencyKey,
  message
) {
  if (!idempotencyKey) {
    throw new Error(
      "Idempotency key manquante."
    );
  }

  await sql`
    UPDATE payout_attempts
    SET
      status = 'unconfirmed',
      error_message = ${String(
        message ||
          "Opération non confirmée."
      ).slice(0, 500)},
      updated_at = NOW()
    WHERE idempotency_key = ${idempotencyKey}
  `;
}

// =====================================================
// ENVOI DU PAYOUT
// =====================================================

export async function sendPayout({
  idempotencyKey,
  amount,
  phoneLocal,
  provider,
  description,
}) {
  if (!idempotencyKey) {
    return {
      ok: false,
      status: "failed",
      error:
        "Identifiant d'idempotence manquant.",
    };
  }

  // -------------------------------------------------
  // Validation défensive
  // -------------------------------------------------

  const validation =
    validatePayout({
      amount,
      phone: phoneLocal,
      provider,
    });

  if (!validation.ok) {
    await markFailed(
      idempotencyKey,
      validation.error
    );

    return {
      ok: false,
      status: "failed",
      error: validation.error,
    };
  }

  const {
    amount: validAmount,
    phoneLocal: validPhone,
    provider: validProvider,
  } = validation;

  // -------------------------------------------------
  // Vérification de l'existence de la tentative
  // -------------------------------------------------

  const [attempt] = await sql`
    SELECT
      id,
      status,
      amount,
      phone,
      provider
    FROM payout_attempts
    WHERE idempotency_key = ${idempotencyKey}
    LIMIT 1
  `;

  if (!attempt) {
    return {
      ok: false,
      status: "failed",
      error:
        "Tentative de payout introuvable.",
    };
  }

  // Protection supplémentaire contre un appel direct
  // à sendPayout() après finalisation.
  if (attempt.status === "succeeded") {
    return {
      ok: true,
      status: "succeeded",
      reference: null,
      idempotent: true,
    };
  }

  if (
    attempt.status !== "pending"
  ) {
    return {
      ok: false,
      status:
        attempt.status === "failed"
          ? "failed"
          : "unconfirmed",
      error:
        "Cette tentative ne peut plus être envoyée automatiquement.",
    };
  }

  // -------------------------------------------------
  // Configuration
  // -------------------------------------------------

  const apiKey =
    process.env.CINETPAY_API_KEY;

  const siteId =
    process.env.CINETPAY_SITE_ID;

  if (!apiKey || !siteId) {
    // Configuration locale absente : on conserve l'état
    // comme échec technique local et non comme succès.
    await markFailed(
      idempotencyKey,
      "API payout non configurée."
    );

    return {
      ok: false,
      status: "failed",
      error:
        "API payout non configurée.",
    };
  }

  const network =
    validProvider === "moov_money"
      ? "moov"
      : "orange";

  try {
    const response = await fetch(
      PAYOUT_ENDPOINT,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
          Accept:
            "application/json",
        },

        signal:
          AbortSignal.timeout(
            TIMEOUT_MS
          ),

        body: JSON.stringify({
          api_key: apiKey,
          site_id: siteId,

          // Cette valeur est l'identifiant d'idempotence
          // côté KIMOXA et doit rester immuable.
          external_transaction_id:
            idempotencyKey,

          amount: validAmount,
          currency: "XOF",

          destination: {
            phone_number:
              `226${validPhone}`,
            network,
          },

          description: String(
            description ||
              "Payout Kimoxa"
          ).slice(0, 120),
        }),
      }
    );

    const data =
      await response
        .json()
        .catch(() => null);

    const reference =
      data?.transaction_id ??
      data?.reference ??
      data?.payout_id ??
      null;

    const status =
      String(
        data?.status || ""
      ).toLowerCase();

    // -------------------------------------------------
    // Succès définitif
    // -------------------------------------------------

    if (
      response.ok &&
      FINAL_SUCCESS_STATUSES.has(
        status
      )
    ) {
      if (!reference) {
        await markUnconfirmed(
          idempotencyKey,
          "Succès fournisseur sans référence."
        );

        return {
          ok: false,
          status: "unconfirmed",
          error:
            "Opération non confirmée : référence fournisseur absente.",
        };
      }

      await markSucceeded(
        idempotencyKey,
        String(reference)
      );

      return {
        ok: true,
        status: "succeeded",
        reference: String(
          reference
        ),
      };
    }

    // -------------------------------------------------
    // Requête acceptée / traitement en cours
    // -------------------------------------------------

    if (
      response.ok &&
      ACCEPTED_STATUSES.has(
        status
      )
    ) {
      await markUnconfirmed(
        idempotencyKey,
        reference
          ? "Paiement en cours de traitement."
          : "Paiement accepté sans référence fournisseur."
      );

      return {
        ok: false,
        status: "unconfirmed",
        reference: reference
          ? String(reference)
          : null,
        error:
          "Paiement en cours. Vérifiez son statut avant toute nouvelle tentative.",
      };
    }

    // -------------------------------------------------
    // Échec explicite
    // -------------------------------------------------

    if (
      FINAL_FAILURE_STATUSES.has(
        status
      )
    ) {
      const providerMessage =
        data?.message ||
        data?.error ||
        data?.description ||
        `Refus fournisseur (${response.status}).`;

      await markFailed(
        idempotencyKey,
        providerMessage
      );

      return {
        ok: false,
        status: "failed",
        error:
          String(
            providerMessage
          ).slice(0, 500),
      };
    }

    // -------------------------------------------------
    // Tout autre résultat = ambigu
    // -------------------------------------------------

    await markUnconfirmed(
      idempotencyKey,
      `Réponse ambiguë (${response.status}, statut: ${
        status || "absent"
      }).`
    );

    return {
      ok: false,
      status: "unconfirmed",
      error:
        "Réponse fournisseur ambiguë. Vérifiez le statut avant toute nouvelle tentative.",
    };
  } catch (error) {
    // Timeout / réseau ≠ échec fournisseur.
    // Le fournisseur a potentiellement reçu le paiement.

    try {
      await markUnconfirmed(
        idempotencyKey,
        `Erreur réseau : ${
          error?.name ||
          "inconnue"
        }.`
      );
    } catch (markError) {
      console.error(
        "[payouts] impossible de marquer unconfirmed:",
        markError.message
      );
    }

    return {
      ok: false,
      status: "unconfirmed",
      error:
        "Réponse fournisseur perdue. Vérifiez le statut avant toute nouvelle tentative.",
    };
  }
}

// =====================================================
// VÉRIFICATION DU STATUT
// =====================================================

export async function checkPayoutStatus(
  attempt
) {
  if (!attempt?.idempotency_key) {
    return {
      status: "unknown",
    };
  }

  const apiKey =
    process.env.CINETPAY_API_KEY;

  const siteId =
    process.env.CINETPAY_SITE_ID;

  if (!apiKey || !siteId) {
    return {
      status: "unknown",
    };
  }

  // Nous n'inventons jamais de référence fournisseur.
  if (!attempt.provider_reference) {
    return {
      status: "unknown",
    };
  }

  try {
    const response =
      await fetch(
        STATUS_ENDPOINT,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
            Accept:
              "application/json",
          },

          signal:
            AbortSignal.timeout(
              TIMEOUT_MS
            ),

          body: JSON.stringify({
            api_key: apiKey,
            site_id: siteId,
            transaction_id:
              attempt.provider_reference,
          }),
        }
      );

    const data =
      await response
        .json()
        .catch(() => null);

    if (!response.ok || !data) {
      return {
        status: "unknown",
      };
    }

    const status =
      String(
        data.status || ""
      ).toLowerCase();

    // -------------------------------------------------
    // Succès définitif
    // -------------------------------------------------

    if (
      FINAL_SUCCESS_STATUSES.has(
        status
      )
    ) {
      await markSucceeded(
        attempt.idempotency_key,
        attempt.provider_reference
      );

      return {
        status: "succeeded",
        reference:
          attempt.provider_reference,
      };
    }

    // -------------------------------------------------
    // Échec définitif
    // -------------------------------------------------

    if (
      FINAL_FAILURE_STATUSES.has(
        status
      )
    ) {
      const message =
        data.message ||
        data.error ||
        "Échec confirmé par le fournisseur.";

      await markFailed(
        attempt.idempotency_key,
        message
      );

      return {
        status: "failed",
        error: String(
          message
        ).slice(0, 500),
      };
    }

    // -------------------------------------------------
    // Toujours en traitement
    // -------------------------------------------------

    await markUnconfirmed(
      attempt.idempotency_key,
      "Paiement toujours en cours de traitement."
    );

    return {
      status: "pending",
      reference:
        attempt.provider_reference,
    };
  } catch {
    // Impossible de déterminer le statut :
    // on ne modifie surtout pas l'état financier.

    return {
      status: "unknown",
    };
  }
}