import sql from "@/lib/db";

// GET /api/vendor/earnings/series?days=7
// Retourne les ventes quotidiennes pour graphique
export async function GET(request) {
  const userId = request.headers.get("x-user-id");
  const url = new URL(request.url);
  const days = Math.min(Math.max(parseInt(url.searchParams.get("days") || "7"), 1), 90);

  const [user] = await sql`SELECT role FROM users WHERE id = ${userId}`;
  if (!user || (user.role !== "vendor" && user.role !== "admin")) {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }

  const [shop] = await sql`SELECT id FROM shops WHERE vendor_id = ${userId}`;
  if (!shop) {
    // Retourne un tableau vide pour les états vides
    const empty = Array.from({ length: days }, (_, i) => ({
      date: new Date(Date.now() - (days - 1 - i) * 86400000).toISOString().split("T")[0],
      gross: 0,
      commission: 0,
      orders: 0,
    }));
    return Response.json({ series: empty });
  }

  const rows = await sql`
    SELECT
      DATE(o.created_at) AS date,
      COALESCE(SUM(scl.gross_amount), 0) AS gross,
      COALESCE(SUM(scl.commission_amount), 0) AS commission,
      COUNT(DISTINCT o.id) AS orders
    FROM orders o
    JOIN shop_commission_ledger scl ON scl.order_id = o.id
    WHERE scl.shop_id = ${shop.id}
      AND o.created_at >= NOW() - (${days} || ' days')::interval
      AND o.status NOT IN ('cancelled')
    GROUP BY DATE(o.created_at)
    ORDER BY date ASC
  `;

  // Remplir les jours vides
  const byDate = new Map(rows.map((r) => [new Date(r.date).toISOString().split("T")[0], r]));
  const series = Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * 86400000);
    const dateStr = d.toISOString().split("T")[0];
    const row = byDate.get(dateStr);
    return {
      date: dateStr,
      gross: row ? Number(row.gross) : 0,
      commission: row ? Number(row.commission) : 0,
      orders: row ? Number(row.orders) : 0,
    };
  });

  return Response.json({ series });
}