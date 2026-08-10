import sql from "@/lib/db";

// GET : état actuel du réglage
export async function GET(request) {
  const userId = request.headers.get("x-user-id");
  const userRole = request.headers.get("x-user-role");
  if (!userId || (userRole !== "vendor" && userRole !== "admin")) {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }
  const [shop] = await sql`
    SELECT delivers_own_orders FROM shops WHERE vendor_id = ${userId}
  `;
  return Response.json({ enabled: Boolean(shop?.delivers_own_orders) });
}

// POST : active/désactive la livraison par la boutique
export async function POST(request) {
  const userId = request.headers.get("x-user-id");
  const userRole = request.headers.get("x-user-role");
  if (!userId || (userRole !== "vendor" && userRole !== "admin")) {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const enabled = Boolean(body.enabled);

  const [shop] = await sql`
    UPDATE shops SET delivers_own_orders = ${enabled}
    WHERE vendor_id = ${userId}
    RETURNING id, delivers_own_orders
  `;
  if (!shop) return Response.json({ error: "Boutique introuvable." }, { status: 404 });

  return Response.json({ ok: true, enabled: shop.delivers_own_orders });
}
