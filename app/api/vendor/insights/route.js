import sql from "@/lib/db";

// GET /api/vendor/insights
// Top produits vendus + avis récents (sections maquette)
export async function GET(request) {
  const userId = request.headers.get("x-user-id");
  const [user] = await sql`SELECT role FROM users WHERE id = ${userId}`;
  if (!user || (user.role !== "vendor" && user.role !== "admin")) {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }

  const [shop] = await sql`SELECT id FROM shops WHERE vendor_id = ${userId}`;
  if (!shop) return Response.json({ topProducts: [], recentReviews: [] });

  let topProducts = [];
  try {
    topProducts = await sql`
      SELECT p.id, p.name, SUM(oi.quantity) AS sold
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      JOIN orders o ON o.id = oi.order_id
      WHERE p.shop_id = ${shop.id}
        AND o.status IN ('paid', 'shipped', 'delivered')
      GROUP BY p.id, p.name
      ORDER BY sold DESC
      LIMIT 5
    `;
  } catch (e) {
    console.error("insights topProducts:", e.message);
  }

  let recentReviews = [];
  try {
    recentReviews = await sql`
      SELECT r.rating, r.comment, r.created_at,
             p.name AS product_name, u.full_name AS author
      FROM reviews r
      JOIN products p ON p.id = r.product_id
      JOIN users u ON u.id = r.user_id
      WHERE p.shop_id = ${shop.id}
      ORDER BY r.created_at DESC
      LIMIT 5
    `;
  } catch (e) {
    console.error("insights recentReviews:", e.message);
  }

  return Response.json({ topProducts, recentReviews });
}