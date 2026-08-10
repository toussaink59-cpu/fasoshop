import sql from "@/lib/db";
import { rateLimit, clientKey } from "@/lib/rate-limit";

// GET /api/vendor/revenue — revenus de la boutique du vendeur connecté
// Sécurisé : vérifie ownership (vendor_id = userId) + rate limit + audit log
export async function GET(request) {
  const userId = request.headers.get("x-user-id");
  const userRole = request.headers.get("x-user-role");

  // 🔒 1) Vérification rôle explicite (défense en profondeur)
  if (!userId || (userRole !== "vendor" && userRole !== "admin")) {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }

  // 🔒 2) Rate limit : max 10 consultations par minute
  const key = `revenue:${clientKey(request)}`;
  if (!rateLimit(key, { limit: 10, windowMs: 60_000 })) {
    return Response.json(
      { error: "Trop de requêtes. Réessayez dans une minute." },
      { status: 429 }
    );
  }

  try {
    // 🔒 3) Vérification ownership : shop DOIT appartenir au vendeur connecté
    const [shop] = await sql`
      SELECT id, status FROM shops WHERE vendor_id = ${userId} LIMIT 1
    `;

    if (!shop || shop.status !== "active") {
      return Response.json({ error: "Accès refusé." }, { status: 403 });
    }

    // 🔒 4) Requête revenus (filtrée par shop_id = ownership vérifié)
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

    // 🔒 5) Audit log (traçabilité consultation revenus)
    sql`
      INSERT INTO security_audit_log (user_id, action, resource_type, resource_id, ip_address)
      VALUES (${userId}, 'view_revenue', 'shop', ${shop.id}, ${clientKey(request)})
    `.catch(() => {}); // non bloquant

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
  } catch (err) {
    console.error("[vendor/revenue GET]", err.message);
    return Response.json({ error: "Impossible de charger les revenus." }, { status: 500 });
  }
}
