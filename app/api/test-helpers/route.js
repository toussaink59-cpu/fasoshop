import sql from "@/lib/db";
import { hash } from "bcryptjs";

const isTestEnv = process.env.NODE_ENV !== "production" || process.env.ALLOW_TEST_HELPERS === "1";

function guard() {
  if (!isTestEnv) {
    return Response.json({ error: "Non disponible en production." }, { status: 403 });
  }
  return null;
}

export async function POST(request) {
  const g = guard();
  if (g) return g;

  const url = new URL(request.url);
  const path = url.pathname;

  if (path.endsWith("/create-user")) {
    try {
      const { email, password, role, full_name } = await request.json();
      const password_hash = await hash(password, 10);
      const [user] = await sql`
        INSERT INTO users (email, password_hash, role, full_name, status)
        VALUES (${email}, ${password_hash}, ${role}, ${full_name}, 'active')
        ON CONFLICT (email) DO UPDATE SET status = 'active', role = EXCLUDED.role
        RETURNING id
      `;
      return Response.json({ userId: user.id, email });
    } catch (err) {
      console.error("[create-user]", err);
      return Response.json({ error: err.message }, { status: 500 });
    }
  }

  if (path.endsWith("/create-shop-product")) {
    try {
      const { vendorEmail, productName, price, stock } = await request.json();
      const [vendor] = await sql`SELECT id FROM users WHERE email = ${vendorEmail}`;
      if (!vendor) return Response.json({ error: "Vendor introuvable" }, { status: 404 });

      const [shop] = await sql`
        INSERT INTO shops (vendor_id, name, status, delivery_fee, offers_delivery, offers_pickup)
        VALUES (${vendor.id}, ${"Boutique Test " + vendor.id}, 'active', 1000, true, true)
        RETURNING id
      `;
      const [product] = await sql`
        INSERT INTO products (shop_id, name, price, stock_quantity, status)
        VALUES (${shop.id}, ${productName}, ${price}, ${stock}, 'active')
        RETURNING id
      `;
      return Response.json({ shopId: shop.id, productId: product.id });
    } catch (err) {
      console.error("[create-shop-product]", err);
      return Response.json({ error: err.message }, { status: 500 });
    }
  }

  const payMatch = path.match(/\/pay-order\/(\d+)$/);
  if (payMatch) {
    const id = Number(payMatch[1]);
    await sql`UPDATE orders SET status = 'paid' WHERE id = ${id}`;
    return Response.json({ ok: true });
  }

  const suspendMatch = path.match(/\/suspend-user\/(.+)$/);
  if (suspendMatch) {
    const email = decodeURIComponent(suspendMatch[1]);
    await sql`UPDATE users SET status = 'suspended' WHERE email = ${email}`;
    return Response.json({ ok: true });
  }

  const unsuspendMatch = path.match(/\/unsuspend-user\/(.+)$/);
  if (unsuspendMatch) {
    const email = decodeURIComponent(unsuspendMatch[1]);
    await sql`UPDATE users SET status = 'active' WHERE email = ${email}`;
    return Response.json({ ok: true });
  }

  if (path.endsWith("/cleanup-all-tests")) {
    await sql`DELETE FROM users WHERE email LIKE 'test_%@kimoxa.test'`;
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Endpoint POST inconnu: " + path }, { status: 404 });
}

export async function GET(request) {
  const g = guard();
  if (g) return g;

  const url = new URL(request.url);
  const path = url.pathname;

  const ledgerMatch = path.match(/\/ledger\/(\d+)\/(\d+)$/);
  if (ledgerMatch) {
    const orderId = Number(ledgerMatch[1]);
    const shopId = Number(ledgerMatch[2]);
    const [ledger] = await sql`
      SELECT delivery_status, payout_status, commission_amount, payout_amount
      FROM shop_commission_ledger
      WHERE order_id = ${orderId} AND shop_id = ${shopId}
    `;
    return Response.json(ledger || {});
  }

  const histMatch = path.match(/\/history\/(\d+)$/);
  if (histMatch) {
    const id = Number(histMatch[1]);
    const rows = await sql`
      SELECT from_status, to_status, actor_role, reason FROM order_status_history
      WHERE order_id = ${id} ORDER BY created_at
    `;
    return Response.json(rows);
  }

  return Response.json({ error: "Endpoint GET inconnu: " + path }, { status: 404 });
}