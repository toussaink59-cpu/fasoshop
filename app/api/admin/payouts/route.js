import sql from "@/lib/db";

// GET /api/admin/payouts — liste tous les payouts (à payer, séquestrés, payés)
export async function GET(request) {
  const userId = request.headers.get("x-user-id");
  const [user] = await sql`SELECT role FROM users WHERE id = ${userId}`;
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }

  const payouts = await sql`
    SELECT l.id, l.order_id, l.shop_id,
           s.name AS shop_name,
           v.full_name AS vendor_name, v.phone AS vendor_phone,
           l.gross_amount, l.commission_amount, l.payout_amount,
           l.payout_status, l.payout_released_at, l.payout_paid_at
    FROM shop_commission_ledger l
    JOIN shops s ON s.id = l.shop_id
    JOIN users v ON v.id = s.vendor_id
    ORDER BY CASE l.payout_status WHEN 'released' THEN 0 WHEN 'held' THEN 1 ELSE 2 END,
             COALESCE(l.payout_released_at, l.payout_paid_at) DESC NULLS LAST
  `;
  return Response.json({ payouts });
}
