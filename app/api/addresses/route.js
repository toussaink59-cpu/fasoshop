import sql from "@/lib/db";

// GET /api/addresses
// Liste les adresses de l'acheteur connecté.
export async function GET(request) {
  const userId = request.headers.get("x-user-id");

  if (!userId) {
    return Response.json({ error: "Connexion requise." }, { status: 401 });
  }

  const addresses = await sql`
    SELECT id, libelle, adresse_texte, phone, par_defaut
    FROM addresses
    WHERE user_id = ${userId}
    ORDER BY par_defaut DESC, created_at DESC
  `;

  return Response.json({ addresses });
}

// POST /api/addresses
// body: { libelle, adresseTexte, phone?, parDefaut? }
export async function POST(request) {
  const userId = request.headers.get("x-user-id");

  if (!userId) {
    return Response.json({ error: "Connexion requise." }, { status: 401 });
  }

  try {
    const { libelle, adresseTexte, phone, parDefaut } = await request.json();

    if (!libelle || !adresseTexte) {
      return Response.json(
        { error: "Le libellé et l'adresse sont requis." },
        { status: 400 }
      );
    }

    // Si c'est la première adresse, ou si demandé explicitement, on la met par défaut
    const [existingCount] = await sql`
      SELECT COUNT(*)::int AS count FROM addresses WHERE user_id = ${userId}
    `;
    const shouldBeDefault = parDefaut || existingCount.count === 0;

    if (shouldBeDefault) {
      await sql`UPDATE addresses SET par_defaut = false WHERE user_id = ${userId}`;
    }

    const [address] = await sql`
      INSERT INTO addresses (user_id, libelle, adresse_texte, phone, par_defaut)
      VALUES (${userId}, ${libelle}, ${adresseTexte}, ${phone || null}, ${shouldBeDefault})
      RETURNING id, libelle, adresse_texte, phone, par_defaut
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
