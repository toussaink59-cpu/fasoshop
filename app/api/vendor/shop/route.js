import sql from "@/lib/db";

const ALLOWED_DOCUMENT_TYPES = ["cni", "passeport", "permis"];
const ALLOWED_MM_OPERATORS = ["orange_money", "moov_money"];

const MAX_DOC_URL_LENGTH = 2_000_000;
const MAX_TEXT_LENGTH = 255;

const BF_PHONE_REGEX = /^(?:\+226|00226)?([67]\d{7})$/;
const DATA_IMAGE_REGEX =
  /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=\s]+)$/i;

// -----------------------------------------------------
// HELPERS
// -----------------------------------------------------

function jsonError(error, status = 400) {
  return Response.json({ error }, { status });
}

function cleanString(value, maxLength = MAX_TEXT_LENGTH) {
  if (typeof value !== "string") return null;

  const cleaned = value.trim();

  if (!cleaned || cleaned.length > maxLength) {
    return null;
  }

  return cleaned;
}

/**
 * Normalisation stricte d'un numéro Burkina Faso.
 *
 * Accepté :
 *   70123456
 *   +22670123456
 *   0022670123456
 *   70 12 34 56
 *
 * Retour :
 *   70123456
 */
function normalizePhoneBF(value) {
  if (typeof value !== "string") return null;

  const cleaned = value.trim().replace(/[\s().-]/g, "");

  const match = cleaned.match(BF_PHONE_REGEX);

  if (!match) return null;

  return match[1];
}

function isAllowedDocumentType(value) {
  return (
    typeof value === "string" &&
    ALLOWED_DOCUMENT_TYPES.includes(value.trim().toLowerCase())
  );
}

/**
 * Vérifie qu'on reçoit réellement une image data URI
 * JPEG / PNG / WEBP.
 */
function validateDocumentImage(value) {
  if (typeof value !== "string") {
    return false;
  }

  if (value.length > MAX_DOC_URL_LENGTH) {
    return false;
  }

  const match = value.match(DATA_IMAGE_REGEX);

  if (!match) {
    return false;
  }

  // Protection supplémentaire contre une chaîne vide.
  const base64 = match[2].replace(/\s/g, "");

  if (!base64 || base64.length < 100) {
    return false;
  }

  return true;
}

// -----------------------------------------------------
// SELECT SÉCURISÉ
// -----------------------------------------------------

async function getVendorShop(userId) {
  if (!userId) return null;

  const [shop] = await sql`
    SELECT
      id,
      name,
      status,
      mobile_money_number,
      mobile_money_operator,
      city,
      id_document_type,
      id_document_number,
      rejection_reason,
      CASE
        WHEN id_document_url IS NOT NULL THEN true
        ELSE false
      END AS has_identity_document
    FROM shops
    WHERE vendor_id = ${userId}
    LIMIT 1
  `;

  return shop || null;
}

// -----------------------------------------------------
// GET /api/vendor/shop
// -----------------------------------------------------

export async function GET(request) {
  const userId = request.headers.get("x-user-id");

  if (!userId) {
    return jsonError("Authentification requise.", 401);
  }

  try {
    const shop = await getVendorShop(userId);

    if (!shop) {
      return jsonError(
        "Aucune boutique associée à ce compte.",
        404
      );
    }

    /*
     * IMPORTANT :
     * id_document_url n'est volontairement PAS renvoyé.
     *
     * C'est une donnée KYC sensible.
     */

    return Response.json({
      shop,
    });
  } catch (err) {
    console.error("GET /api/vendor/shop:", err);

    return jsonError(
      "Erreur serveur lors de la récupération de la boutique.",
      500
    );
  }
}

// -----------------------------------------------------
// PATCH /api/vendor/shop
//
// Une seule opération autorisée par requête.
//
// city
// mobileMoneyNumber + mobileMoneyOperator
// idDocumentType + idDocumentNumber + idDocumentUrl
// -----------------------------------------------------

export async function PATCH(request) {
  const userId = request.headers.get("x-user-id");

  if (!userId) {
    return jsonError("Authentification requise.", 401);
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return jsonError("Corps de requête JSON invalide.", 400);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonError("Données invalides.", 400);
  }

  const {
    mobileMoneyNumber,
    mobileMoneyOperator,
    idDocumentType,
    idDocumentNumber,
    idDocumentUrl,
    city,
  } = body;

  try {
    // -------------------------------------------------
    // Vérifier la boutique AVANT toute modification
    // -------------------------------------------------

    const currentShop = await sql`
      SELECT
        id,
        name,
        status,
        mobile_money_number,
        mobile_money_operator,
        city,
        id_document_type,
        id_document_number,
        id_document_url,
        rejection_reason
      FROM shops
      WHERE vendor_id = ${userId}
      LIMIT 1
    `;

    const shop = currentShop[0];

    if (!shop) {
      return jsonError(
        "Aucune boutique associée à ce compte.",
        404
      );
    }

    // -------------------------------------------------
    // Déterminer l'opération demandée
    // -------------------------------------------------

    const hasCityUpdate = city !== undefined;

    const hasMobileMoneyUpdate =
      mobileMoneyNumber !== undefined ||
      mobileMoneyOperator !== undefined;

    const hasKycUpdate =
      idDocumentType !== undefined ||
      idDocumentNumber !== undefined ||
      idDocumentUrl !== undefined;

    const operationCount = [
      hasCityUpdate,
      hasMobileMoneyUpdate,
      hasKycUpdate,
    ].filter(Boolean).length;

    if (operationCount === 0) {
      return jsonError(
        "Aucune donnée à mettre à jour.",
        400
      );
    }

    if (operationCount > 1) {
      return jsonError(
        "Une seule opération de modification est autorisée par requête.",
        400
      );
    }

    // =================================================
    // 1. MODIFICATION DE LA VILLE
    // =================================================

    if (hasCityUpdate) {
      if (typeof city !== "string") {
        return jsonError(
          "La ville doit être une chaîne de caractères.",
          400
        );
      }

      const cleanedCity = city.trim();

      if (cleanedCity.length > 100) {
        return jsonError(
          "Le nom de la ville est trop long.",
          400
        );
      }

      const [updatedShop] = await sql`
        UPDATE shops
        SET city = ${cleanedCity || null}
        WHERE id = ${shop.id}
        RETURNING
          id,
          name,
          status,
          mobile_money_number,
          mobile_money_operator,
          city,
          id_document_type,
          id_document_number,
          rejection_reason,
          CASE
            WHEN id_document_url IS NOT NULL THEN true
            ELSE false
          END AS has_identity_document
      `;

      return Response.json({
        shop: updatedShop,
      });
    }

    // =================================================
    // 2. MODIFICATION MOBILE MONEY
    // =================================================

    if (hasMobileMoneyUpdate) {
      if (
        typeof mobileMoneyNumber !== "string" ||
        typeof mobileMoneyOperator !== "string"
      ) {
        return jsonError(
          "Le numéro et l'opérateur Mobile Money sont requis.",
          400
        );
      }

      const normalizedPhone =
        normalizePhoneBF(mobileMoneyNumber);

      if (!normalizedPhone) {
        return jsonError(
          "Numéro Mobile Money invalide. Utilisez un numéro BF valide à 8 chiffres.",
          400
        );
      }

      const operator =
        mobileMoneyOperator.trim().toLowerCase();

      if (!ALLOWED_MM_OPERATORS.includes(operator)) {
        return jsonError(
          "Opérateur Mobile Money non pris en charge.",
          400
        );
      }

      /*
       * Si la boutique est déjà active, le changement
       * du moyen de paiement doit repasser par une
       * validation administrative.
       *
       * On ne laisse donc jamais un vendeur modifier
       * silencieusement son compte de paiement.
       */
      const requiresRevalidation =
        shop.status === "active" &&
        (
          shop.mobile_money_number !== normalizedPhone ||
          shop.mobile_money_operator !== operator
        );

      const newStatus = requiresRevalidation
        ? "pending"
        : shop.status;

      const [updatedShop] = await sql`
        UPDATE shops
        SET
          mobile_money_number = ${normalizedPhone},
          mobile_money_operator = ${operator},
          status = ${newStatus},
          rejection_reason = CASE
            WHEN ${requiresRevalidation}
              THEN NULL
            ELSE rejection_reason
          END
        WHERE id = ${shop.id}
        RETURNING
          id,
          name,
          status,
          mobile_money_number,
          mobile_money_operator,
          city,
          id_document_type,
          id_document_number,
          rejection_reason,
          CASE
            WHEN id_document_url IS NOT NULL THEN true
            ELSE false
          END AS has_identity_document
      `;

      return Response.json({
        shop: updatedShop,
        verificationRequired: requiresRevalidation,
      });
    }

    // =================================================
    // 3. KYC / PIÈCE D'IDENTITÉ
    // =================================================

    if (hasKycUpdate) {
      if (
        typeof idDocumentType !== "string" ||
        !isAllowedDocumentType(idDocumentType)
      ) {
        return jsonError(
          "Type de pièce d'identité invalide.",
          400
        );
      }

      const documentType =
        idDocumentType.trim().toLowerCase();

      if (typeof idDocumentNumber !== "string") {
        return jsonError(
          "Le numéro de la pièce d'identité est requis.",
          400
        );
      }

      const documentNumber =
        idDocumentNumber.trim();

      if (
        documentNumber.length < 4 ||
        documentNumber.length > 100
      ) {
        return jsonError(
          "Numéro de pièce d'identité invalide.",
          400
        );
      }

      if (
        typeof idDocumentUrl !== "string" ||
        !validateDocumentImage(idDocumentUrl)
      ) {
        return jsonError(
          "La photo de la pièce d'identité est invalide. JPEG, PNG ou WEBP uniquement.",
          400
        );
      }

      /*
       * Toute nouvelle pièce = nouvelle validation.
       *
       * Même si le vendeur était précédemment validé,
       * la nouvelle pièce ne devient jamais automatiquement
       * approuvée.
       */
      const [updatedShop] = await sql`
        UPDATE shops
        SET
          id_document_type = ${documentType},
          id_document_number = ${documentNumber},
          id_document_url = ${idDocumentUrl},
          status = 'pending',
          rejection_reason = NULL
        WHERE id = ${shop.id}
        RETURNING
          id,
          name,
          status,
          mobile_money_number,
          mobile_money_operator,
          city,
          id_document_type,
          id_document_number,
          rejection_reason,
          CASE
            WHEN id_document_url IS NOT NULL THEN true
            ELSE false
          END AS has_identity_document
      `;

      return Response.json({
        shop: updatedShop,
        verificationRequired: true,
      });
    }

    return jsonError(
      "Aucune donnée à mettre à jour.",
      400
    );
  } catch (err) {
    console.error("PATCH /api/vendor/shop:", err);

    return jsonError(
      "Erreur serveur lors de la mise à jour de la boutique.",
      500
    );
  }
}
