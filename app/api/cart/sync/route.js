import sql from "@/lib/db";

/**
 * POST /api/cart/sync
 * Body: { items: [{ productId, quantity, name, price, image }], totalCents }
 * Synchronise le panier du user connecte dans abandoned_carts.
 * Appele par le client a chaque modification du panier.
 */
export async function POST(request) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return Response.json({ error: "Non authentifie." }, { status: 401 });

  const [user] = await sql`SELECT email FROM users WHERE id = ${userId}`;
  if (!user || !user.email) {
    return Response.json({ error: "Email introuvable." }, { status: 400 });
  }

  try {
    const { items, totalCents } = await request.json();
    if (!Array.isArray(items)) {
      return Response.json({ error: "items invalide." }, { status: 400 });
    }

    // Nettoyer les items : garder uniquement les champs utiles
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

/**
 * DELETE /api/cart/sync
 * Appele quand le user finalise une commande -> marque converted_at.
 */
export async function DELETE(request) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return Response.json({ error: "Non authentifie." }, { status: 401 });
  await sql`
    UPDATE abandoned_carts
    SET converted_at = now()
    WHERE user_id = ${userId} AND converted_at IS NULL
  `;
  return Response.json({ ok: true });
}
