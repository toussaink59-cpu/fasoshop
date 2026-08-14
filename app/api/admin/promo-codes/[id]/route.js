import sql from "@/lib/db";

// PATCH /api/admin/promo-codes/[id] — active/désactive un code
export async function PATCH(request, { params }) {
  try {
    const userId = request.headers.get("x-user-id");
    const [user] = await sql`SELECT role FROM users WHERE id = ${userId}`;
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Accès refusé." }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const [updated] = await sql`
      UPDATE promo_codes SET active = ${Boolean(body.active)}
      WHERE id = ${Number(id)} RETURNING *
    `;

    if (!updated) return Response.json({ error: "Code introuvable." }, { status: 404 });
    return Response.json({ code: updated });
  } catch (err) {
    console.error("PATCH promo-codes erreur:", err);
    return Response.json({ error: `Erreur serveur: ${err.message}` }, { status: 500 });
  }
}

// DELETE /api/admin/promo-codes/[id] — supprime un code
export async function DELETE(request, { params }) {
  try {
    const userId = request.headers.get("x-user-id");
    const [user] = await sql`SELECT role FROM users WHERE id = ${userId}`;
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Accès refusé." }, { status: 403 });
    }

    const { id } = await params;
    const [deleted] = await sql`DELETE FROM promo_codes WHERE id = ${Number(id)} RETURNING *`;
    if (!deleted) return Response.json({ error: "Code introuvable." }, { status: 404 });
    return Response.json({ success: true });
  } catch (err) {
    console.error("DELETE promo-codes erreur:", err);
    return Response.json({ error: `Erreur serveur: ${err.message}` }, { status: 500 });
  }
}