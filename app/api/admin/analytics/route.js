import sql from "@/lib/db";
import { adminGuard } from "@/lib/adminAuth";

// GET /api/admin/analytics
// Vue d'ensemble des ventes pour l'admin : série quotidienne (30 jours),
// série mensuelle (6 mois), ventes par catégorie, par vendeur, top produits.
export async function GET(request) {
  const guardError = adminGuard(request);
  if (guardError) return guardError;

  const dailyRows = await sql`
    SELECT created_at::date AS day, COALESCE(SUM(gross_amount), 0)::float AS gross
    FROM shop_commission_ledger
    WHERE created_at >= CURRENT_DATE - INTERVAL '29 days'
    GROUP BY day
    ORDER BY day
  `;
  const dailyMap = new Map(dailyRows.map((r) => [r.day.toISOString().slice(0, 10), r.gross]));
  const dailySeries = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailySeries.push({ date: key, gross: dailyMap.get(key) || 0 });
  }

  const monthlyRows = await sql`
    SELECT date_trunc('month', created_at)::date AS month, COALESCE(SUM(gross_amount), 0)::float AS gross
    FROM shop_commission_ledger
    WHERE created_at >= date_trunc('month', CURRENT_DATE) - INTERVAL '5 months'
    GROUP BY month
    ORDER BY month
  `;
  const monthlyMap = new Map(monthlyRows.map((r) => [r.month.toISOString().slice(0, 7), r.gross]));
  const monthlySeries = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i, 1);
    const key = d.toISOString().slice(0, 7);
    monthlySeries.push({ month: key, gross: monthlyMap.get(key) || 0 });
  }

  const salesByCategory = await sql`
    SELECT COALESCE(parent.name, c.name, 'Non catégorisé') AS category_name,
           COALESCE(SUM(oi.quantity * oi.price_at_purchase), 0)::float AS revenue
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    JOIN orders o ON o.id = oi.order_id AND o.status IN ('paid', 'shipped', 'delivered')
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN categories parent ON parent.id = c.parent_id
    GROUP BY category_name
    ORDER BY revenue DESC
    LIMIT 8
  `;

  const salesByVendor = await sql`
    SELECT s.name AS shop_name, u.full_name AS vendor_name,
           COALESCE(SUM(l.gross_amount), 0)::float AS revenue,
           COUNT(DISTINCT l.order_id)::int AS order_count
    FROM shop_commission_ledger l
    JOIN shops s ON s.id = l.shop_id
    JOIN users u ON u.id = s.vendor_id
    GROUP BY s.name, u.full_name
    ORDER BY revenue DESC
    LIMIT 10
  `;

  const topProducts = await sql`
    SELECT p.name AS product_name, s.name AS shop_name,
           COALESCE(SUM(oi.quantity), 0)::int AS units_sold,
           COALESCE(SUM(oi.quantity * oi.price_at_purchase), 0)::float AS revenue
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    JOIN shops s ON s.id = p.shop_id
    JOIN orders o ON o.id = oi.order_id AND o.status IN ('paid', 'shipped', 'delivered')
    GROUP BY p.id, p.name, s.name
    ORDER BY units_sold DESC
    LIMIT 10
  `;

  const yearsRows = await sql`
    SELECT DISTINCT EXTRACT(YEAR FROM created_at)::int AS year
    FROM shop_commission_ledger
    ORDER BY year DESC
  `;
  const availableYears = yearsRows.length > 0 ? yearsRows.map((r) => r.year) : [new Date().getFullYear()];

  return Response.json({ dailySeries, monthlySeries, salesByCategory, salesByVendor, topProducts, availableYears });
}
