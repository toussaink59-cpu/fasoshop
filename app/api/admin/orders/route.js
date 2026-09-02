import sql from "@/lib/db";
import { adminGuard } from "@/lib/adminAuth";
import { parsePagination, buildPaginationMeta } from "@/lib/pagination";

// GET /api/admin/orders
// Vue d'ensemble des ventes pour l'admin avec pagination.
// Query params : ?page=1&limit=25&filter=stagnant
export async function GET(request) {
  const guardError = await adminGuard(request);
  if (guardError) return guardError;

  // P2-13 : pagination
  const { page, limit, offset } = parsePagination(request);
  const filter = new URL(request.url).searchParams.get("filter");

  let whereClause = "";
  let params = [];
  
  if (filter === "stagnant") {
    whereClause = "WHERE o.status IN ('pending', 'paid') AND o.created_at < NOW() - INTERVAL '3 days'";
  }

  const orders = await sql.unsafe(`
    SELECT o.id, o.status, o.created_at, u.full_name AS buyer_name, u.email AS buyer_email,
           COALESCE(SUM(l.gross_amount), 0) AS total_amount,
           COUNT(DISTINCT l.shop_id) AS shop_count
    FROM orders o
    JOIN users u ON u.id = o.buyer_id
    LEFT JOIN shop_commission_ledger l ON l.order_id = o.id
    ${whereClause}
    GROUP BY o.id, o.status, o.created_at, u.full_name, u.email
    ORDER BY o.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `, []);

  const [{ count }] = await sql.unsafe(`
    SELECT COUNT(DISTINCT o.id) AS count
    FROM orders o
    ${whereClause}
  `, []);

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

  return Response.json({
    orders,
    stats,
    pagination: buildPaginationMeta(page, limit, Number(count)),
  });
}
