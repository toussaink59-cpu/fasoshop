import sql from "@/lib/db";
import { getUserAddresses } from "@/lib/queries/addresses";

// GET /api/addresses
export async function GET(request) {
  const userId = request.headers.get("x-user-id");

  if (!userId) {
    return Response.json({ error: "Connexion requise." }, { status: 401 });
  }

  const addresses = await getUserAddresses(userId);
  return Response.json({ addresses });
}

// POST /api/addresses
// body: { libelle, adresseTexte, phone?, parDefaut?, latitude?, longitude? }
export async function POST(request) {
  const userId = request.headers.get("x-user-id");

  if (!userId) {
    return Response.json({ error: "Connexion requise." }, { status: 401 });
  }

  try {
    const { libelle, adresseTexte, phone, parDefaut, latitude, longitude } = await request.json();

    if (!libelle || !adresseTexte) {
      return Response.json(
        { error: "Le libellé et l'adresse sont requis." },
        { status: 400 }
      );
    }

    const [existingCount] = await sql`
      SELECT COUNT(*)::int AS count FROM addresses WHERE user_id = ${userId}
    `;
    const shouldBeDefault = parDefaut || existingCount.count === 0;

    if (shouldBeDefault) {
      await sql`UPDATE addresses SET par_defaut = false WHERE user_id = ${userId}`;
    }

    const [address] = await sql`
      INSERT INTO addresses (user_id, libelle, adresse_texte, phone, par_defaut, latitude, longitude)
      VALUES (${userId}, ${libelle}, ${adresseTexte}, ${phone || null}, ${shouldBeDefault}, ${latitude || null}, ${longitude || null})
      RETURNING id, libelle, adresse_texte, phone, par_defaut, latitude, longitude
    `;

    return Response.json({ address }, { status: 201 });
  } catch (err) {
    console.error("Erreur création adresse:", err);
    return Response.json(
      { error: "Erreur serveur lors de l'enregistrement de l'adresse." },
      { status: 500 }
    );
  }
}
