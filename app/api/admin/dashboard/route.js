import sql from "@/lib/db";
import { getAdminEarnings } from "@/lib/queries/earnings";

/**
 * GET /api/admin/dashboard
 * Cockpit admin : tous les KPIs en un seul appel.
 * - CA jour/semaine/mois avec deltas (%)
 * - Nouveaux clients jour/semaine/mois
 * - Panier moyen
 * - Produits en rupture imminente
 * - Commandes stagnantes (> 3 jours)
 * - Payouts en attente
 * - Top 3 vendeurs
 */
export async function GET(request) {
  const userId = request.headers.get("x-user-id");
  const [user] = await sql`SELECT role FROM users WHERE id = ${userId}`;
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }

  try {
    // === KPIs temporels avec deltas ===
    const revenueStats = await sql`
      WITH periods AS (
        SELECT
          COALESCE(SUM(CASE WHEN created_at >= CURRENT_DATE THEN total ELSE 0 END), 0) AS today,
          COALESCE(SUM(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '6 days' THEN total ELSE 0 END), 0) AS week,
          COALESCE(SUM(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '13 days' AND created_at < CURRENT_DATE - INTERVAL '6 days' THEN total ELSE 0 END), 0) AS prev_week,
          COALESCE(SUM(CASE WHEN created_at >= date_trunc('month', CURRENT_DATE) THEN total ELSE 0 END), 0) AS month,
          COALESCE(SUM(CASE WHEN created_at >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' AND created_at < date_trunc('month', CURRENT_DATE) THEN total ELSE 0 END), 0) AS prev_month
        FROM orders
        WHERE status IN ('paid', 'shipped', 'delivered')
      )
      SELECT
        today::float,
        week::float,
        prev_week::float,
        CASE WHEN prev_week > 0 THEN ROUND((week - prev_week) / prev_week * 100, 1)::float ELSE 0 END AS week_delta,
        month::float,
        prev_month::float,
        CASE WHEN prev_month > 0 THEN ROUND((month - prev_month) / prev_month * 100, 1)::float ELSE 0 END AS month_delta
      FROM periods
    `;

    const newCustomers = await sql`
      SELECT
        COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END)::int AS today,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '6 days' THEN 1 END)::int AS week,
        COUNT(CASE WHEN created_at >= date_trunc('month', CURRENT_DATE) THEN 1 END)::int AS month
      FROM users
      WHERE role = 'buyer'
    `;

    const [avgBasket] = await sql`
      SELECT COALESCE(AVG(total), 0)::float AS avg
      FROM orders
      WHERE status IN ('paid', 'shipped', 'delivered')
        AND created_at >= CURRENT_DATE - INTERVAL '29 days'
    `;

    // === Alertes ===
    const lowStockProducts = await sql`
      SELECT COUNT(*)::int AS count
      FROM products
      WHERE status = 'active'
        AND stock_quantity > 0
        AND stock_quantity <= low_stock_threshold
    `;

    const stagnantOrders = await sql`
      SELECT COUNT(*)::int AS count
      FROM orders
      WHERE status IN ('paid', 'shipped')
        AND created_at < NOW() - INTERVAL '3 days'
    `;

    // === Payouts en attente ===
    const earnings = await getAdminEarnings();

    // === Top 3 vendeurs ===
    const topVendors = await sql`
      SELECT s.name AS shop_name, u.full_name AS vendor_name,
             COALESCE(SUM(l.gross_amount), 0)::float AS revenue,
             COUNT(DISTINCT l.order_id)::int AS order_count
      FROM shop_commission_ledger l
      JOIN shops s ON s.id = l.shop_id
      JOIN users u ON u.id = s.vendor_id
      WHERE l.created_at >= date_trunc('month', CURRENT_DATE)
      GROUP BY s.name, u.full_name
      ORDER BY revenue DESC
      LIMIT 3
    `;

    return Response.json({
      revenue: {
        today: revenueStats[0].today,
        week: revenueStats[0].week,
        week_delta: revenueStats[0].week_delta,
        month: revenueStats[0].month,
        month_delta: revenueStats[0].month_delta,
      },
      customers: newCustomers[0],
      avgBasket: avgBasket.avg,
      alerts: {
        lowStock: lowStockProducts[0].count,
        stagnantOrders: stagnantOrders[0].count,
      },
      payouts: {
        released_count: earnings.released_count,
        released_amount: earnings.released_amount,
      },
      topVendors,
    });
  } catch (err) {
    console.error("[admin/dashboard]", err);
    return Response.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
