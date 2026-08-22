import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "vendor" && user.role !== "admin")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const rows = await sql`SELECT id FROM shops WHERE vendor_id = ${user.id}`;
    if (!rows[0]) {
      return NextResponse.json({ revenue: null });
    }
    const shopId = rows[0].id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const firstDayMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Date pré-calculée côté JS (évite le bug SQL timestamp - interval)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // Stats du jour
    const [todayStats] = await sql`
      SELECT
        COALESCE(SUM(scl.gross_amount), 0)::int AS sales,
        COUNT(DISTINCT scl.order_id)::int AS orders
      FROM shop_commission_ledger scl
      JOIN orders o ON o.id = scl.order_id
      WHERE scl.shop_id = ${shopId}
        AND o.created_at >= ${today.toISOString()}
    `;

    // Stats du mois
    const [monthStats] = await sql`
      SELECT
        COALESCE(SUM(scl.gross_amount), 0)::int AS sales,
        COUNT(DISTINCT scl.order_id)::int AS orders
      FROM shop_commission_ledger scl
      JOIN orders o ON o.id = scl.order_id
      WHERE scl.shop_id = ${shopId}
        AND o.created_at >= ${firstDayMonth.toISOString()}
    `;

    // Stats globales
    const [global] = await sql`
      SELECT
        COALESCE(SUM(scl.gross_amount), 0)::int AS gross,
        COALESCE(SUM(scl.commission_amount), 0)::int AS commission,
        COALESCE(SUM(CASE WHEN scl.payout_status = 'paid' THEN scl.payout_amount ELSE 0 END), 0)::int AS settled,
        COALESCE(SUM(CASE WHEN scl.payout_status != 'paid' THEN scl.payout_amount ELSE 0 END), 0)::int AS due
      FROM shop_commission_ledger scl
      WHERE scl.shop_id = ${shopId}
    `;

    // Commissions Mobile Money déjà prélevées
    const [mmCommission] = await sql`
      SELECT COALESCE(SUM(scl.commission_amount), 0)::int AS total
      FROM shop_commission_ledger scl
      JOIN orders o ON o.id = scl.order_id
      WHERE scl.shop_id = ${shopId}
        AND o.payment_method = 'mobile_money'
        AND scl.payout_status = 'paid'
    `;

    // Commissions espèces à reverser
    const [codCommissionDue] = await sql`
      SELECT COALESCE(SUM(scl.commission_amount), 0)::int AS total
      FROM shop_commission_ledger scl
      JOIN orders o ON o.id = scl.order_id
      WHERE scl.shop_id = ${shopId}
        AND o.payment_method = 'cod'
        AND scl.status = 'due'
    `;

    // Série 30 derniers jours — date pré-calculée (plus de bug SQL)
    const dailySeries = await sql`
      SELECT
        DATE(o.created_at) AS day,
        COALESCE(SUM(scl.gross_amount), 0)::int AS gross,
        COALESCE(SUM(scl.commission_amount), 0)::int AS commission
      FROM shop_commission_ledger scl
      JOIN orders o ON o.id = scl.order_id
      WHERE scl.shop_id = ${shopId}
        AND o.created_at >= ${thirtyDaysAgo.toISOString()}
      GROUP BY DATE(o.created_at)
      ORDER BY day ASC
    `;

    return NextResponse.json({
      revenue: {
        todaySales: Number(todayStats?.sales || 0),
        todayOrderCount: Number(todayStats?.orders || 0),
        monthSales: Number(monthStats?.sales || 0),
        monthOrderCount: Number(monthStats?.orders || 0),
        grossSales: Number(global?.gross || 0),
        totalCommission: Number(global?.commission || 0),
        netAmountSettled: Number(global?.settled || 0),
        netAmountDue: Number(global?.due || 0),
        mmCommissionSettled: Number(mmCommission?.total || 0),
        codCommissionDue: Number(codCommissionDue?.total || 0),
        dailySeries: (dailySeries || []).map((d) => ({
          day: d.day,
          gross: Number(d.gross),
          commission: Number(d.commission),
        })),
      },
    });
  } catch (err) {
    console.error("[vendor/revenue] GET error:", err);
    return NextResponse.json(
      { error: "Erreur serveur", detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}