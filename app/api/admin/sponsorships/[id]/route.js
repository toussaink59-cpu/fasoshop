import sql from "@/lib/db";
import { adminGuard } from "@/lib/adminAuth";

const SPONSOR_DURATION_DAYS = 30;

// PATCH /api/admin/sponsorships/[id]
// Approuve ou rejette une demande de sponsoring.
// body: { status: 'approved' | 'rejected', adminNotes? }
export async function PATCH(request, { params }) {
  const guardError = adminGuard(request);
  if (guardError) return guardError;

  const { id } = await params;

  try {
    const { status, adminNotes } = await request.json();
    if (!["approved", "rejected"].includes(status)) {
      return Response.json({ error: "Statut invalide." }, { status: 400 });
    }

    const [reqRow] = await sql`
      SELECT id, product_id, status FROM sponsorship_requests WHERE id = ${id}
    `;
    if (!reqRow) {
      return Response.json({ error: "Demande introuvable." }, { status: 404 });
    }
    if (reqRow.status !== "pending") {
      return Response.json({ error: "Cette demande a déjà été traitée." }, { status: 400 });
    }

    await sql`
      UPDATE sponsorship_requests
      SET status = ${status}, admin_notes = ${adminNotes || null}, reviewed_at = NOW()
      WHERE id = ${id}
    `;

    if (status === "approved") {
      await sql`
        UPDATE products
        SET is_sponsored = true, sponsored_until = NOW() + (${SPONSOR_DURATION_DAYS} || ' days')::interval
        WHERE id = ${reqRow.product_id}
      `;
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("Erreur traitement demande sponsoring:", err);
    return Response.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
