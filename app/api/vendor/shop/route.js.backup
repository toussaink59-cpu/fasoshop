import sql from "@/lib/db";

const ALLOWED_DOCUMENT_TYPES = ["cni", "passeport", "permis"];
// Taille max pour une photo en base64 (~1.5 Mo après compression côté client)
const MAX_DOC_URL_LENGTH = 2000000;

// GET /api/vendor/shop
// Renvoie les infos de la boutique du vendeur connecté, y compris son statut
// de vérification d'identité, son statut Mobile Money et la photo de sa pièce.
export async function GET(request) {
  const userId = request.headers.get("x-user-id");

  const [shop] = await sql`
    SELECT id, name, status, mobile_money_number, mobile_money_operator, city,
           id_document_type, id_document_number, id_document_url, rejection_reason
    FROM shops
    WHERE vendor_id = ${userId}
    LIMIT 1
  `;

  if (!shop) {
    return Response.json({ error: "Aucune boutique associée à ce compte." }, { status: 404 });
  }

  return Response.json({ shop });
}

// PATCH /api/vendor/shop
// Met à jour : ville, Mobile Money, OU soumission pièce d'identité
// (avec photo obligatoire en base64 — le statut passe à 'pending' en attente de validation admin).
// body: { mobileMoneyNumber?, mobileMoneyOperator?, city?, idDocumentType?, idDocumentNumber?, idDocumentUrl? }
export async function PATCH(request) {
  const userId = request.headers.get("x-user-id");

  try {
    const {
      mobileMoneyNumber,
      mobileMoneyOperator,
      idDocumentType,
      idDocumentNumber,
      idDocumentUrl,
      city,
    } = await request.json();

    // Cas 0 : mise à jour de la ville de la boutique
    if (city !== undefined) {
      const [shop] = await sql`
        UPDATE shops
        SET city = ${city.trim() || null}
        WHERE vendor_id = ${userId}
        RETURNING id, name, status, mobile_money_number, mobile_money_operator, city,
                  id_document_type, id_document_number, id_document_url, rejection_reason
      `;
      if (!shop) {
        return Response.json({ error: "Aucune boutique associée à ce compte." }, { status: 404 });
      }
      return Response.json({ shop });
    }

    // Cas 1 : mise à jour Mobile Money
    if (mobileMoneyNumber !== undefined || mobileMoneyOperator !== undefined) {
      if (!mobileMoneyNumber || !mobileMoneyOperator) {
        return Response.json(
          { error: "Le numéro et l'opérateur Mobile Money sont requis." },
          { status: 400 }
        );
      }
      if (!["orange_money", "moov_money"].includes(mobileMoneyOperator)) {
        return Response.json({ error: "Opérateur invalide." }, { status: 400 });
      }
      const digitsOnly = mobileMoneyNumber.replace(/\D/g, "");
      if (digitsOnly.length < 8) {
        return Response.json({ error: "Numéro de téléphone invalide." }, { status: 400 });
      }

      const [shop] = await sql`
        UPDATE shops
        SET mobile_money_number = ${mobileMoneyNumber}, mobile_money_operator = ${mobileMoneyOperator}
        WHERE vendor_id = ${userId}
        RETURNING id, name, status, mobile_money_number, mobile_money_operator, city,
                  id_document_type, id_document_number, id_document_url, rejection_reason
      `;

      if (!shop) {
        return Response.json({ error: "Aucune boutique associée à ce compte." }, { status: 404 });
      }
      return Response.json({ shop });
    }

    // Cas 2 : soumission / resoumission de la pièce d'identité (avec photo)
    if (idDocumentType !== undefined || idDocumentNumber !== undefined || idDocumentUrl !== undefined) {
      if (!idDocumentType || !ALLOWED_DOCUMENT_TYPES.includes(idDocumentType)) {
        return Response.json({ error: "Type de pièce d'identité invalide." }, { status: 400 });
      }
      if (!idDocumentNumber || idDocumentNumber.trim().length < 4) {
        return Response.json({ error: "Le numéro de la pièce d'identité est requis." }, { status: 400 });
      }
      if (!idDocumentUrl || typeof idDocumentUrl !== "string" || !idDocumentUrl.startsWith("data:image/")) {
        return Response.json({ error: "La photo de la pièce d'identité est obligatoire." }, { status: 400 });
      }
      if (idDocumentUrl.length > MAX_DOC_URL_LENGTH) {
        return Response.json(
          { error: "Photo trop lourde. Utilisez une image plus légère (la compression est automatique)." },
          { status: 400 }
        );
      }

      const [shop] = await sql`
        UPDATE shops
        SET id_document_type = ${idDocumentType},
            id_document_number = ${idDocumentNumber.trim()},
            id_document_url = ${idDocumentUrl},
            status = 'pending',
            rejection_reason = NULL
        WHERE vendor_id = ${userId}
        RETURNING id, name, status, mobile_money_number, mobile_money_operator,
                  id_document_type, id_document_number, id_document_url, rejection_reason
      `;

      if (!shop) {
        return Response.json({ error: "Aucune boutique associée à ce compte." }, { status: 404 });
      }
      return Response.json({ shop });
    }

    return Response.json({ error: "Aucune donnée à mettre à jour." }, { status: 400 });
  } catch (err) {
    console.error("Erreur mise à jour boutique:", err);
    return Response.json(
      { error: "Erreur serveur lors de la mise à jour." },
      { status: 500 }
    );
  }
}
