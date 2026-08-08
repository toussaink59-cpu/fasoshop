import sql from "@/lib/db";

// POST /api/admin/payouts/[id] — l'admin verse le payout au vendeur (released → paid)
export async function POST(request, { params }) {
  const userId = request.headers.get("x-user-id");
  const [user] = await sql`SELECT role FROM users WHERE id = ${userId}`;
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { id } = await params;

  const updated = await sql`
    UPDATE shop_commission_ledger
    SET payout_status = 'paid', payout_paid_at = NOW()
    WHERE id = ${id} AND payout_status = 'released'
    RETURNING id, payout_amount
  `;

  if (updated.length === 0) {
    return Response.json({ error: "Payout introuvable ou déjà payé." }, { status: 404 });
  }

  return Response.json({ ok: true, payout: updated[0] });
}
