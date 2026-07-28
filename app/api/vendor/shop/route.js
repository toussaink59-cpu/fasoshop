import sql from "@/lib/db";

const ALLOWED_DOCUMENT_TYPES = ["cni", "passeport", "permis"];

// GET /api/vendor/shop
// Renvoie les infos de la boutique du vendeur connecté, y compris son statut
// de vérification d'identité et son statut Mobile Money.
export async function GET(request) {
  const userId = request.headers.get("x-user-id");

  const [shop] = await sql`
    SELECT id, name, status, mobile_money_number, mobile_money_operator,
           id_document_type, id_document_number, rejection_reason
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
// Met à jour soit le numéro Mobile Money, soit les infos de pièce d'identité
// (utile pour resoumettre après un rejet — remet le statut à 'pending').
// body: { mobileMoneyNumber?, mobileMoneyOperator?, idDocumentType?, idDocumentNumber? }
export async function PATCH(request) {
  const userId = request.headers.get("x-user-id");

  try {
    const { mobileMoneyNumber, mobileMoneyOperator, idDocumentType, idDocumentNumber } = await request.json();

    // Cas 1 : mise à jour Mobile Money (comportement existant)
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
        RETURNING id, name, status, mobile_money_number, mobile_money_operator,
                  id_document_type, id_document_number, rejection_reason
      `;

      if (!shop) {
        return Response.json({ error: "Aucune boutique associée à ce compte." }, { status: 404 });
      }

      return Response.json({ shop });
    }

    // Cas 2 : resoumission des infos de pièce d'identité après un rejet
    if (idDocumentType !== undefined || idDocumentNumber !== undefined) {
      if (!idDocumentType || !ALLOWED_DOCUMENT_TYPES.includes(idDocumentType)) {
        return Response.json(
          { error: "Type de pièce d'identité invalide." },
          { status: 400 }
        );
      }
      if (!idDocumentNumber || idDocumentNumber.trim().length < 4) {
        return Response.json(
          { error: "Le numéro de la pièce d'identité est requis." },
          { status: 400 }
        );
      }

      const [shop] = await sql`
        UPDATE shops
        SET id_document_type = ${idDocumentType},
            id_document_number = ${idDocumentNumber.trim()},
            status = 'pending',
            rejection_reason = NULL
        WHERE vendor_id = ${userId}
        RETURNING id, name, status, mobile_money_number, mobile_money_operator,
                  id_document_type, id_document_number, rejection_reason
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
