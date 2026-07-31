import sql from "@/lib/db";

// GET /api/vendor/revenue
// Calcule les revenus de la boutique du vendeur connecté :
// ventes brutes, commission totale, montant net dû, montant déjà versé,
// ventes du jour/du mois, et série quotidienne des 30 derniers jours
// (pour le petit graphique du dashboard).
export async function GET(request) {
  const userId = request.headers.get("x-user-id");

  const [shop] = await sql`
    SELECT id FROM shops WHERE vendor_id = ${userId} LIMIT 1
  `;
  if (!shop) {
    return Response.json({ error: "Aucune boutique associée à ce compte." }, { status: 404 });
  }

  const [totals] = await sql`
    SELECT
      COALESCE(SUM(gross_amount), 0)::float AS gross_sales,
      COALESCE(SUM(commission_amount), 0)::float AS total_commission,
      COALESCE(SUM(gross_amount - commission_amount) FILTER (WHERE status = 'due'), 0)::float AS net_amount_due,
      COALESCE(SUM(gross_amount - commission_amount) FILTER (WHERE status = 'settled'), 0)::float AS net_amount_settled,
      COUNT(*)::int AS order_count,
      COALESCE(SUM(gross_amount) FILTER (WHERE created_at::date = CURRENT_DATE), 0)::float AS today_sales,
      COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE)::int AS today_order_count,
      COALESCE(SUM(gross_amount) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)), 0)::float AS month_sales,
      COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE))::int AS month_order_count
    FROM shop_commission_ledger
    WHERE shop_id = ${shop.id}
  `;

  const dailyRows = await sql`
    SELECT created_at::date AS day, COALESCE(SUM(gross_amount), 0)::float AS gross
    FROM shop_commission_ledger
    WHERE shop_id = ${shop.id} AND created_at >= CURRENT_DATE - INTERVAL '29 days'
    GROUP BY day
    ORDER BY day
  `;

  // Complète les jours sans vente avec 0, pour un graphique continu sur 30 jours
  const dailyMap = new Map(dailyRows.map((r) => [r.day.toISOString().slice(0, 10), r.gross]));
  const dailySeries = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailySeries.push({ date: key, gross: dailyMap.get(key) || 0 });
  }

  return Response.json({
    revenue: {
      grossSales: totals.gross_sales,
      totalCommission: totals.total_commission,
      netAmountDue: totals.net_amount_due,
      netAmountSettled: totals.net_amount_settled,
      orderCount: totals.order_count,
      todaySales: totals.today_sales,
      todayOrderCount: totals.today_order_count,
      monthSales: totals.month_sales,
      monthOrderCount: totals.month_order_count,
      dailySeries,
    },
  });
}
