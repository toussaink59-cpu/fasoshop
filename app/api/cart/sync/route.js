import { rateLimit, clientKey } from "@/lib/rate-limit";
import sql from "@/lib/db";

export async function POST(request) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return Response.json({ error: "Non authentifie." }, { status: 401 });
  // P1-B : rate limit - max 10 syncs par minute par IP
  const rlKey = `cart-sync:${clientKey(request)}`;
  if (!(await rateLimit(rlKey, { limit: 10, windowMs: 60_000 }))) {
    return Response.json({ error: "Trop de requetes. Reessayez dans une minute." }, { status: 429 });
  }
  const [user] = await sql`SELECT email FROM users WHERE id = ${userId}`;
  if (!user || !user.email) return Response.json({ error: "Email introuvable." }, { status: 400 });
  try {
    const { items, totalCents } = await request.json();
    if (!Array.isArray(items)) return Response.json({ error: "items invalide." }, { status: 400 });
    const cleanItems = items
      .filter((i) => i && i.productId && i.quantity > 0)
      .map((i) => ({
        productId: Number(i.productId),
        quantity: Number(i.quantity),
        name: String(i.name || "").slice(0, 200),
        price: Number(i.price) || 0,
        image: String(i.image || "").slice(0, 500),
      }));
    const total = Number(totalCents) || 0;
    await sql`
      INSERT INTO abandoned_carts (user_id, email, items, total_cents, last_seen)
      VALUES (${userId}, ${user.email}, ${sql.json(cleanItems)}, ${total}, now())
      ON CONFLICT (user_id) DO UPDATE SET
        items = EXCLUDED.items,
        total_cents = EXCLUDED.total_cents,
        last_seen = now()
    `;
    return Response.json({ ok: true, count: cleanItems.length });
  } catch (err) {
    console.error("[cart/sync]", err);
    return Response.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function DELETE(request) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return Response.json({ error: "Non authentifie." }, { status: 401 });
  const rlKeyDel = `cart-del:${clientKey(request)}`;
  if (!(await rateLimit(rlKeyDel, { limit: 10, windowMs: 60_000 }))) {
    return Response.json({ error: "Trop de requetes." }, { status: 429 });
  }
  await sql`UPDATE abandoned_carts SET converted_at = now() WHERE user_id = ${userId} AND converted_at IS NULL`;
  return Response.json({ ok: true });
}
