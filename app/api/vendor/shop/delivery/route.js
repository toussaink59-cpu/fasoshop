import sql from "@/lib/db";
import { rateLimit, clientKey } from "@/lib/rate-limit";

// GET : état actuel du réglage (vendeur actif uniquement)
export async function GET(request) {
  const userId = request.headers.get("x-user-id");
  const userRole = request.headers.get("x-user-role");

  // 🔒 1) Auth + rôle
  if (!userId || userRole !== "vendor") {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }

  try {
    // 🔒 2) Vendeur actif + boutique active (pas pending, pas suspended)
    const [row] = await sql`
      SELECT u.id AS user_id, u.status AS user_status,
             s.id AS shop_id, s.status AS shop_status, s.delivers_own_orders
      FROM users u
      LEFT JOIN shops s ON s.vendor_id = u.id
      WHERE u.id = ${userId}
    `;

    if (!row || !row.shop_id) {
      return Response.json({ error: "Boutique introuvable." }, { status: 404 });
    }
    if (row.user_status === "suspended") {
      return Response.json({ error: "Votre compte est suspendu." }, { status: 403 });
    }
    if (row.shop_status !== "active") {
      // pending / rejected / suspended → lecture seule
      return Response.json({
        enabled: Boolean(row.delivers_own_orders),
        readOnly: true,
        reason:
          row.shop_status === "pending"
            ? "Boutique en attente de vérification."
            : row.shop_status === "rejected"
              ? "Boutique non validée."
              : "Boutique suspendue.",
      });
    }

    return Response.json({ enabled: Boolean(row.delivers_own_orders) });
  } catch (err) {
    console.error("[vendor/shop/delivery GET]", err.message);
    return Response.json({ error: "Impossible de charger le réglage." }, { status: 500 });
  }
}

// POST : active/désactive (vendeur actif + boutique active UNIQUEMENT)
export async function POST(request) {
  const userId = request.headers.get("x-user-id");
  const userRole = request.headers.get("x-user-role");

  // 🔒 1) Auth + rôle
  if (!userId || userRole !== "vendor") {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }

  // 🔒 2) Rate limit : max 5 changements par minute
  const key = `vendor-delivery:${userId}`;
  if (!(await rateLimit(key, { limit: 5, windowMs: 60_000 }))) {
    return Response.json({ error: "Trop de modifications. Réessayez dans une minute." }, { status: 429 });
  }

  try {
    // 🔒 3) Validation stricte enabled === boolean
    const body = await request.json().catch(() => null);
    if (body === null || typeof body.enabled !== "boolean") {
      return Response.json({ error: "Paramètre 'enabled' invalide." }, { status: 400 });
    }
    const enabled = body.enabled;

    // 🔒 4) Vendeur + boutique : contrôles d'autorisation complets
    const [row] = await sql`
      SELECT u.id AS user_id, u.status AS user_status,
             s.id AS shop_id, s.status AS shop_status
      FROM users u
      LEFT JOIN shops s ON s.vendor_id = u.id
      WHERE u.id = ${userId}
    `;

    if (!row || !row.shop_id) {
      return Response.json({ error: "Boutique introuvable." }, { status: 404 });
    }
    if (row.user_status === "suspended") {
      return Response.json({ error: "Votre compte est suspendu." }, { status: 403 });
    }
    if (row.shop_status !== "active") {
      return Response.json({
        error:
          row.shop_status === "pending"
            ? "Activez ce réglage après validation de votre boutique."
            : row.shop_status === "rejected"
              ? "Votre boutique n'a pas été validée."
              : "Votre boutique est suspendue.",
      }, { status: 403 });
    }

    // 🔒 5) UPDATE borné au vendeur courant (anti-IDOR)
    const [shop] = await sql`
      UPDATE shops
      SET delivers_own_orders = ${enabled}
      WHERE id = ${row.shop_id} AND vendor_id = ${userId}
      RETURNING id, delivers_own_orders
    `;
    if (!shop) {
      return Response.json({ error: "Boutique introuvable." }, { status: 404 });
    }

    // 🔒 6) Audit log
    sql`
      INSERT INTO security_audit_log (user_id, action, resource_type, resource_id, ip_address)
      VALUES (${userId}, ${enabled ? "delivery_self_on" : "delivery_self_off"}, 'shop', ${row.shop_id}, ${clientKey(request)})
    `.catch(() => {});

    return Response.json({ ok: true, enabled: shop.delivers_own_orders });
  } catch (err) {
    console.error("[vendor/shop/delivery POST]", err.message);
    return Response.json({ error: "Impossible de modifier le réglage." }, { status: 500 });
  }
}
