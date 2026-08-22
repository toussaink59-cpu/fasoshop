import sql from "@/lib/db";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { adminGuard } from "@/lib/adminAuth";

// POST : l'admin paie le livreur (référence obligatoire)
export async function POST(request, { params }) {
  const guardError = adminGuard(request);
  if (guardError) return guardError;

  const userId = request.headers.get("x-user-id");
  const userRole = request.headers.get("x-user-role");
  if (!userId || userRole !== "admin") {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }

  const key = `admin-courier:${userId}`;
  if (!(await rateLimit(key, { limit: 1, windowMs: 10_000 }))) {
    return Response.json({ error: "Veuillez patienter avant un autre paiement." }, { status: 429 });
  }

  const { id } = await params;
  const courierId = Number(id);
  if (!Number.isInteger(courierId) || courierId <= 0) {
    return Response.json({ error: "Payout livreur invalide." }, { status: 400 });
  }

  const [admin] = await sql`SELECT id, role, status FROM users WHERE id = ${userId}`;
  if (!admin || admin.role !== "admin" || admin.status === "suspended") {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const reference = String(body.transactionReference || "").trim();
  if (reference.length < 5) {
    return Response.json({ error: "Référence de paiement requise (min 5 caractères)." }, { status: 400 });
  }

  const [updated] = await sql`
    UPDATE courier_payouts
    SET status = 'paid', paid_at = NOW(), payment_reference = ${reference}
    WHERE id = ${courierId} AND status = 'due'
    RETURNING id, order_id, amount
  `;
  if (!updated) {
    return Response.json({ error: "Payout livreur introuvable ou déjà payé." }, { status: 404 });
  }

  sql`
    INSERT INTO security_audit_log (user_id, action, resource_type, resource_id, ip_address)
    VALUES (${userId}, 'courier_paid', 'courier_payout', ${courierId}, ${clientKey(request)})
  `.catch(() => {});

  return Response.json({ ok: true, payout: updated });
}
