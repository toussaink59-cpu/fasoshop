import sql from "@/lib/db";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { payoutMode } from "@/lib/payouts";

const MAX_RESULTS_PER_PAGE = 100;

// GET /api/admin/payouts — liste les payouts vendeurs + payouts livreurs
export async function GET(request) {
  const userId = request.headers.get("x-user-id");
  const userRole = request.headers.get("x-user-role");

  // 🔒 1) Vérification rôle explicite (défense en profondeur)
  if (!userId || userRole !== "admin") {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }

  // 🔒 2) Rate limit : max 10 consultations par minute (même pour admin)
  const key = `admin-payouts:${clientKey(request)}`;
  if (!rateLimit(key, { limit: 10, windowMs: 60_000 })) {
    return Response.json(
      { error: "Trop de requêtes. Réessayez dans une minute." },
      { status: 429 }
    );
  }

  try {
    // 🔒 3) Vérification que l'admin existe et n'est pas suspendu
    const [admin] = await sql`
      SELECT id, role, status FROM users WHERE id = ${userId}
    `;
    if (!admin || admin.role !== "admin" || admin.status === "suspended") {
      return Response.json({ error: "Accès refusé." }, { status: 403 });
    }

    // 🔒 4) Pagination (évite de charger 100 000 lignes d'un coup)
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit")) || MAX_RESULTS_PER_PAGE, MAX_RESULTS_PER_PAGE);
    const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);

    // Payouts vendeurs
    const payouts = await sql`
      SELECT l.id, l.order_id, l.shop_id,
             s.name AS shop_name,
             s.mobile_money_number,
             s.mobile_money_provider,
             v.full_name AS vendor_name, v.phone AS vendor_phone,
             l.gross_amount, l.commission_amount, l.payout_amount,
             l.payout_status, l.payout_released_at, l.payout_paid_at,
             l.delivery_fee_amount
      FROM shop_commission_ledger l
      JOIN shops s ON s.id = l.shop_id
      JOIN users v ON v.id = s.vendor_id
      ORDER BY CASE l.payout_status WHEN 'released' THEN 0 WHEN 'held' THEN 1 ELSE 2 END,
               COALESCE(l.payout_released_at, l.payout_paid_at) DESC NULLS LAST
      LIMIT ${limit} OFFSET ${offset}
    `;

    // 🛵 Payouts livreurs (argent de livraison Kimoxa)
    const couriers = await sql`
      SELECT c.id, c.order_id, c.amount, c.status, c.paid_at, c.payment_reference,
             o.shipping_address, o.fulfilled_by
      FROM courier_payouts c
      JOIN orders o ON o.id = c.order_id
      WHERE o.fulfilled_by = 'kimoxa'
      ORDER BY c.status ASC, c.created_at DESC
      LIMIT ${limit}
    `;

    // 🔒 5) Audit log (traçabilité consultation payouts — donnée très sensible)
    sql`
      INSERT INTO security_audit_log (user_id, action, resource_type, ip_address)
      VALUES (${userId}, 'view_payouts', 'payout', ${clientKey(request)})
    `.catch(() => {});

    return Response.json({ payouts, couriers, limit, offset, payoutMode: payoutMode() });
  } catch (err) {
    console.error("[admin/payouts GET]", err.message);
    return Response.json({ error: "Impossible de charger les payouts." }, { status: 500 });
  }
}
