import sql from "@/lib/db";

// PATCH /api/addresses/[id]
// body: { libelle?, adresseTexte?, phone?, parDefaut? }
export async function PATCH(request, { params }) {
  const userId = request.headers.get("x-user-id");
  const { id } = await params;

  if (!userId) {
    return Response.json({ error: "Connexion requise." }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Vérifie que l'adresse appartient bien à l'utilisateur connecté
    const [existing] = await sql`
      SELECT id FROM addresses WHERE id = ${id} AND user_id = ${userId}
    `;
    if (!existing) {
      return Response.json({ error: "Adresse introuvable." }, { status: 404 });
    }

    if (body.parDefaut) {
      await sql`UPDATE addresses SET par_defaut = false WHERE user_id = ${userId}`;
    }

    const [address] = await sql`
      UPDATE addresses
      SET
        libelle = COALESCE(${body.libelle ?? null}, libelle),
        adresse_texte = COALESCE(${body.adresseTexte ?? null}, adresse_texte),
        phone = COALESCE(${body.phone ?? null}, phone),
        par_defaut = COALESCE(${body.parDefaut ?? null}, par_defaut)
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING id, libelle, adresse_texte, phone, par_defaut
    `;

    return Response.json({ address });
  } catch (err) {
    console.error("Erreur mise à jour adresse:", err);
    return Response.json(
      { error: "Erreur serveur lors de la mise à jour de l'adresse." },
      { status: 500 }
    );
  }
}

// DELETE /api/addresses/[id]
export async function DELETE(request, { params }) {
  const userId = request.headers.get("x-user-id");
  const { id } = await params;

  if (!userId) {
    return Response.json({ error: "Connexion requise." }, { status: 401 });
  }

  const [deleted] = await sql`
    DELETE FROM addresses WHERE id = ${id} AND user_id = ${userId} RETURNING id
  `;

  if (!deleted) {
    return Response.json({ error: "Adresse introuvable." }, { status: 404 });
  }

  return Response.json({ success: true });
}
