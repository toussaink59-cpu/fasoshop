import sql from "@/lib/db";

/**
 * GET /api/vendor/dashboard
 * Cockpit vendeur : tous les KPIs en un seul appel.
 * - CA jour/semaine/mois avec deltas (%)
 * - Commandes par statut (à préparer, expédiées, livrées)
 * - Alertes stock bas + ruptures
 * - Top 3 produits du mois
 * - Note moyenne boutique
 * - Avis non répondus
 */
export async function GET(request) {
  const userId = request.headers.get("x-user-id");
  const [user] = await sql`SELECT role FROM users WHERE id = ${userId}`;
  if (!user || (user.role !== "vendor" && user.role !== "admin")) {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }

  const [shop] = await sql`SELECT id FROM shops WHERE vendor_id = ${userId}`;
  if (!shop) {
    return Response.json({ error: "Boutique introuvable." }, { status: 404 });
  }

  try {
    // === CA avec deltas ===
    const revenueStats = await sql`
      WITH periods AS (
        SELECT
          COALESCE(SUM(CASE WHEN l.created_at >= CURRENT_DATE THEN l.gross_amount ELSE 0 END), 0) AS today,
          COALESCE(SUM(CASE WHEN l.created_at >= CURRENT_DATE - INTERVAL '6 days' THEN l.gross_amount ELSE 0 END), 0) AS week,
          COALESCE(SUM(CASE WHEN l.created_at >= CURRENT_DATE - INTERVAL '13 days' AND l.created_at < CURRENT_DATE - INTERVAL '6 days' THEN l.gross_amount ELSE 0 END), 0) AS prev_week,
          COALESCE(SUM(CASE WHEN l.created_at >= date_trunc('month', CURRENT_DATE) THEN l.gross_amount ELSE 0 END), 0) AS month,
          COALESCE(SUM(CASE WHEN l.created_at >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' AND l.created_at < date_trunc('month', CURRENT_DATE) THEN l.gross_amount ELSE 0 END), 0) AS prev_month
        FROM shop_commission_ledger l
        WHERE l.shop_id = ${shop.id}
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

    // === Commandes par statut ===
    const orderStats = await sql`
      SELECT
        COUNT(CASE WHEN status = 'pending' THEN 1 END)::int AS pending,
        COUNT(CASE WHEN status = 'paid' THEN 1 END)::int AS to_prepare,
        COUNT(CASE WHEN status = 'preparation' THEN 1 END)::int AS preparing,
        COUNT(CASE WHEN status = 'shipped' THEN 1 END)::int AS shipped,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END)::int AS delivered
      FROM orders
      WHERE id IN (
        SELECT DISTINCT order_id FROM order_items
        WHERE product_id IN (SELECT id FROM products WHERE shop_id = ${shop.id})
      )
    `;

    // === Alertes stock ===
    const stockAlerts = await sql`
      SELECT
        COUNT(CASE WHEN stock_quantity = 0 AND status = 'active' THEN 1 END)::int AS out_of_stock,
        COUNT(CASE WHEN stock_quantity > 0 AND stock_quantity <= low_stock_threshold AND status = 'active' THEN 1 END)::int AS low_stock
      FROM products
      WHERE shop_id = ${shop.id}
    `;

    // === Top 3 produits du mois ===
    const topProducts = await sql`
      SELECT p.id, p.name,
             COALESCE(SUM(oi.quantity), 0)::int AS units_sold,
             COALESCE(SUM(oi.quantity * oi.price_at_purchase), 0)::float AS revenue
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      JOIN orders o ON o.id = oi.order_id
      WHERE p.shop_id = ${shop.id}
        AND o.status IN ('paid', 'shipped', 'delivered')
        AND o.created_at >= date_trunc('month', CURRENT_DATE)
      GROUP BY p.id, p.name
      ORDER BY units_sold DESC
      LIMIT 3
    `;

    // === Note moyenne boutique ===
    const [shopRating] = await sql`
      SELECT
        COALESCE(AVG(r.rating), 0)::float AS avg_rating,
        COUNT(*)::int AS review_count
      FROM reviews r
      JOIN products p ON p.id = r.product_id
      WHERE p.shop_id = ${shop.id}
    `;

    // === Avis sans réponse vendeur ===
    // Compatible avec les bases qui n'ont pas encore la colonne reviews.vendor_reply.
    const [hasVendorReplyColumn] = await sql`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'reviews'
          AND column_name = 'vendor_reply'
      ) AS exists
    `;

    let unanswered = { count: 0 };

    if (hasVendorReplyColumn.exists) {
      [unanswered] = await sql`
        SELECT COUNT(*)::int AS count
        FROM reviews r
        JOIN products p ON p.id = r.product_id
        WHERE p.shop_id = ${shop.id}
          AND (r.vendor_reply IS NULL OR btrim(r.vendor_reply) = '')
      `;
    }

    return Response.json({
      revenue: {
        today: revenueStats[0].today,
        week: revenueStats[0].week,
        week_delta: revenueStats[0].week_delta,
        month: revenueStats[0].month,
        month_delta: revenueStats[0].month_delta,
      },
      orders: orderStats[0],
      stock: stockAlerts[0],
      topProducts,
      rating: shopRating,
      unansweredReviews: unanswered.count,
    });
  } catch (err) {
    console.error("[vendor/dashboard]", err);
    return Response.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
