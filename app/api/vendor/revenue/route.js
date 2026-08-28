import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "vendor" && user.role !== "admin")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const rows = await sql`SELECT id, status FROM shops WHERE vendor_id = ${user.id}`;
    if (!rows[0]) return NextResponse.json({ revenue: null });
    const shopId = rows[0].id;
    const shopStatus = rows[0].status;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const firstDayMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // 🔒 Séquestrés (en attente de confirmation client)
    const [sequestre] = await sql`
      SELECT COALESCE(SUM(scl.payout_amount), 0)::int AS amount,
             COUNT(DISTINCT scl.order_id)::int AS orders
      FROM shop_commission_ledger scl
      WHERE scl.shop_id = ${shopId}
        AND scl.payout_status = 'held'
        AND scl.delivery_status = 'shipped'
    `;

    // ✅ Disponibles (libérés, prêts à reverser)
    const [disponible] = await sql`
      SELECT COALESCE(SUM(scl.payout_amount), 0)::int AS amount,
             COUNT(DISTINCT scl.order_id)::int AS orders
      FROM shop_commission_ledger scl
      WHERE scl.shop_id = ${shopId}
        AND scl.payout_status IN ('released', 'cod_pending')
    `;

    // 💸 Déjà reversés
    const [reverse] = await sql`
      SELECT COALESCE(SUM(scl.payout_amount), 0)::int AS amount,
             COUNT(DISTINCT scl.order_id)::int AS orders
      FROM shop_commission_ledger scl
      WHERE scl.shop_id = ${shopId}
        AND scl.payout_status = 'paid'
    `;

    const [todayStats] = await sql`
      SELECT COALESCE(SUM(scl.gross_amount), 0)::int AS sales,
             COUNT(DISTINCT scl.order_id)::int AS orders
      FROM shop_commission_ledger scl
      JOIN orders o ON o.id = scl.order_id
      WHERE scl.shop_id = ${shopId}
        AND o.created_at >= ${today.toISOString()}
    `;

    const [monthStats] = await sql`
      SELECT COALESCE(SUM(scl.gross_amount), 0)::int AS sales,
             COUNT(DISTINCT scl.order_id)::int AS orders
      FROM shop_commission_ledger scl
      JOIN orders o ON o.id = scl.order_id
      WHERE scl.shop_id = ${shopId}
        AND o.created_at >= ${firstDayMonth.toISOString()}
    `;

    const [global] = await sql`
      SELECT COALESCE(SUM(scl.gross_amount), 0)::int AS gross,
             COALESCE(SUM(scl.commission_amount), 0)::int AS commission,
             COALESCE(SUM(CASE WHEN scl.payout_status = 'paid' THEN scl.payout_amount ELSE 0 END), 0)::int AS settled,
             COALESCE(SUM(CASE WHEN scl.payout_status != 'paid' THEN scl.payout_amount ELSE 0 END), 0)::int AS due
      FROM shop_commission_ledger scl
      WHERE scl.shop_id = ${shopId}
    `;

    const dailySeries = await sql`
      SELECT DATE(o.created_at) AS day,
             COALESCE(SUM(scl.gross_amount), 0)::int AS gross,
             COALESCE(SUM(scl.commission_amount), 0)::int AS commission
      FROM shop_commission_ledger scl
      JOIN orders o ON o.id = scl.order_id
      WHERE scl.shop_id = ${shopId}
        AND o.created_at >= ${thirtyDaysAgo.toISOString()}
      GROUP BY DATE(o.created_at)
      ORDER BY day ASC
    `;

    const [prodCount] = await sql`SELECT COUNT(*)::int AS count FROM products WHERE shop_id = ${shopId}`;

    // Demandes de reversement
    const [pendingReq] = await sql`
      SELECT COALESCE(SUM(amount), 0)::int AS amount, COUNT(*)::int AS count
      FROM payout_requests WHERE shop_id = ${shopId} AND status = 'pending'
    `;
    const recentRequests = await sql`
      SELECT id, amount, status, created_at, admin_notes
      FROM payout_requests WHERE shop_id = ${shopId}
      ORDER BY created_at DESC LIMIT 5
    `;

    return NextResponse.json({
      revenue: {
        shopStatus,
        sequestre: {
          amount: Number(sequestre?.amount || 0),
          orders: Number(sequestre?.orders || 0),
        },
        disponible: {
          amount: Number(disponible?.amount || 0),
          orders: Number(disponible?.orders || 0),
        },
        reverse: {
          amount: Number(reverse?.amount || 0),
          orders: Number(reverse?.orders || 0),
        },
        todaySales: Number(todayStats?.sales || 0),
        todayOrderCount: Number(todayStats?.orders || 0),
        monthSales: Number(monthStats?.sales || 0),
        monthOrderCount: Number(monthStats?.orders || 0),
        grossSales: Number(global?.gross || 0),
        totalCommission: Number(global?.commission || 0),
        netAmountSettled: Number(global?.settled || 0),
        netAmountDue: Number(global?.due || 0),
        productsCount: Number(prodCount?.count || 0),
        pendingRequest: {
          amount: Number(pendingReq?.amount || 0),
          count: Number(pendingReq?.count || 0),
        },
        recentRequests: (recentRequests || []).map((r) => ({
          id: r.id,
          amount: Number(r.amount),
          status: r.status,
          createdAt: r.created_at,
          adminNotes: r.admin_notes,
        })),
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
