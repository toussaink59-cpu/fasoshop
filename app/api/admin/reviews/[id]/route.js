import sql from "@/lib/db";
import { adminGuard } from "@/lib/adminAuth";

// DELETE /api/admin/reviews/[id]
// Supprime un avis (modération admin).
export async function DELETE(request, { params }) {
  const guardError = adminGuard(request);
  if (guardError) return guardError;

  const { id } = await params;

  const [deleted] = await sql`
    DELETE FROM reviews WHERE id = ${id} RETURNING id
  `;

  if (!deleted) {
    return Response.json({ error: "Avis introuvable." }, { status: 404 });
  }

  return Response.json({ success: true });
}
