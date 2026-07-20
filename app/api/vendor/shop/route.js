import sql from "@/lib/db";

// GET /api/vendor/shop
// Renvoie les infos de la boutique du vendeur connecté, y compris son statut Mobile Money.
export async function GET(request) {
  const userId = request.headers.get("x-user-id");

  const [shop] = await sql`
    SELECT id, name, mobile_money_number, mobile_money_operator
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
// Met à jour le numéro Mobile Money du vendeur (nécessaire pour recevoir les reversements automatiques).
// body: { mobileMoneyNumber, mobileMoneyOperator }
export async function PATCH(request) {
  const userId = request.headers.get("x-user-id");

  try {
    const { mobileMoneyNumber, mobileMoneyOperator } = await request.json();

    if (!mobileMoneyNumber || !mobileMoneyOperator) {
      return Response.json(
        { error: "Le numéro et l'opérateur Mobile Money sont requis." },
        { status: 400 }
      );
    }

    if (!["orange_money", "moov_money"].includes(mobileMoneyOperator)) {
      return Response.json(
        { error: "Opérateur invalide." },
        { status: 400 }
      );
    }

    // Validation simple : un numéro burkinabè fait 8 chiffres (avec ou sans espaces/indicatif)
    const digitsOnly = mobileMoneyNumber.replace(/\D/g, "");
    if (digitsOnly.length < 8) {
      return Response.json(
        { error: "Numéro de téléphone invalide." },
        { status: 400 }
      );
    }

    const [shop] = await sql`
      UPDATE shops
      SET mobile_money_number = ${mobileMoneyNumber}, mobile_money_operator = ${mobileMoneyOperator}
      WHERE vendor_id = ${userId}
      RETURNING id, name, mobile_money_number, mobile_money_operator
    `;

    if (!shop) {
      return Response.json({ error: "Aucune boutique associée à ce compte." }, { status: 404 });
    }

    return Response.json({ shop });
  } catch (err) {
    console.error("Erreur mise à jour Mobile Money:", err);
    return Response.json(
      { error: "Erreur serveur lors de la mise à jour." },
      { status: 500 }
    );
  }
}