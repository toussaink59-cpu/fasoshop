import sql from "@/lib/db";

// GET /api/admin/orders
// Vue d'ensemble des ventes pour l'admin : commandes récentes + statistiques
// (commandes du jour, chiffre d'affaires du jour, total, en attente).
export async function GET() {
  const orders = await sql`
    SELECT o.id, o.status, o.created_at, u.full_name AS buyer_name, u.email AS buyer_email,
           COALESCE(SUM(l.gross_amount), 0) AS total_amount,
           COUNT(DISTINCT l.shop_id) AS shop_count
    FROM orders o
    JOIN users u ON u.id = o.buyer_id
    LEFT JOIN shop_commission_ledger l ON l.order_id = o.id
    GROUP BY o.id, o.status, o.created_at, u.full_name, u.email
    ORDER BY o.created_at DESC
    LIMIT 50
  `;

  const [stats] = await sql`
    SELECT
      COUNT(DISTINCT o.id) FILTER (WHERE o.created_at::date = CURRENT_DATE) AS orders_today,
      COALESCE(SUM(l.gross_amount) FILTER (WHERE o.created_at::date = CURRENT_DATE), 0) AS revenue_today,
      COUNT(DISTINCT o.id) AS orders_total,
      COALESCE(SUM(l.gross_amount), 0) AS revenue_total,
      COUNT(DISTINCT l.order_id) FILTER (WHERE l.delivery_status = 'preparation') AS orders_awaiting
    FROM orders o
    LEFT JOIN shop_commission_ledger l ON l.order_id = o.id
  `;

  return Response.json({ orders, stats });
}
