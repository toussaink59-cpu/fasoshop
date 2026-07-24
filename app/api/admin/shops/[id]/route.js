import sql from "@/lib/db";

// PATCH /api/admin/shops/[id]
// Change le statut d'une boutique. Réservé aux admins (vérifié par middleware.js).
// body: { status: "active" | "suspended" | "pending" }
export async function PATCH(request, { params }) {
  const { id } = await params;

  try {
    const { status } = await request.json();

    const allowedStatuses = ["active", "suspended", "pending"];
    if (!allowedStatuses.includes(status)) {
      return Response.json(
        { error: "Statut invalide. Utilisez active, suspended ou pending." },
        { status: 400 }
      );
    }

    const [shop] = await sql`
      UPDATE shops
      SET status = ${status}
      WHERE id = ${id}
      RETURNING id, name, status, vendor_id
    `;

    if (!shop) {
      return Response.json({ error: "Boutique introuvable." }, { status: 404 });
    }

    return Response.json({ shop });
  } catch (err) {
    console.error("Erreur mise à jour statut boutique:", err);
    return Response.json(
      { error: "Erreur serveur lors de la mise à jour du statut." },
      { status: 500 }
    );
  }
}
