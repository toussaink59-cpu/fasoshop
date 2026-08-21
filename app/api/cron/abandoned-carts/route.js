import sql from "@/lib/db";
import { sendAbandonedCartEmail } from "@/lib/email/abandoned-cart";
import { isValidCronAuth } from "@/lib/cronAuth";

export async function GET(request) {
  // Fail-closed + comparaison timing-safe (voir lib/cronAuth.js)
  if (!isValidCronAuth(request)) {
    console.warn("[cron/abandoned-carts] Unauthorized attempt");
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const candidates = await sql`
      SELECT ac.user_id, ac.email, ac.items, ac.total_cents, u.full_name
      FROM abandoned_carts ac
      JOIN users u ON u.id = ac.user_id
      WHERE ac.reminded_at IS NULL AND ac.converted_at IS NULL
        AND ac.last_seen < now() - interval '24 hours'
        AND jsonb_array_length(ac.items) > 0
        AND ac.total_cents > 0
      LIMIT 50
    `;
    let sent = 0, failed = 0;
    for (const c of candidates) {
      const rawItems = Array.isArray(c.items) ? c.items : [];
      if (rawItems.length === 0) continue;

      // 🔒 Corrige V-03 : on ne fait plus confiance au nom/prix/image stockés
      // (potentiellement fournis par le client via /api/cart/sync). On les
      // re-résout depuis la table products, source de vérité, juste avant
      // l'envoi de l'e-mail. Un produit supprimé/désactivé est simplement
      // exclu du récapitulatif plutôt que d'afficher une donnée non fiable.
      const productIds = rawItems
        .map((i) => Number(i.productId))
        .filter((n) => Number.isInteger(n) && n > 0);

      const realProducts = productIds.length
        ? await sql`
            SELECT id, name, price, images, status
            FROM products
            WHERE id = ANY(${productIds}::int[]) AND status = 'active'
          `
        : [];
      const realProductsMap = Object.fromEntries(realProducts.map((p) => [p.id, p]));

      const safeItems = rawItems
        .map((i) => {
          const p = realProductsMap[Number(i.productId)];
          if (!p) return null; // produit supprimé/désactivé depuis → on l'ignore
          const quantity = Number.isInteger(i.quantity) && i.quantity > 0
            ? Math.min(i.quantity, 99)
            : 1;
          const firstImage = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : "";
          return {
            productId: p.id,
            name: p.name,               // ← vérité serveur, plus jamais celle du client
            price: Number(p.price),     // ← vérité serveur
            image: firstImage,          // ← vérité serveur
            quantity,
          };
        })
        .filter(Boolean);

      if (safeItems.length === 0) {
        // Plus aucun produit valide dans ce panier : on n'envoie pas de relance trompeuse
        await sql`UPDATE abandoned_carts SET reminded_at = now() WHERE user_id = ${c.user_id}`;
        continue;
      }

      const realTotalCents = Math.round(
        safeItems.reduce((sum, it) => sum + it.price * it.quantity, 0) * 100
      );

      const result = await sendAbandonedCartEmail(c.email, c.full_name, safeItems, realTotalCents);
      if (result.ok) {
        await sql`UPDATE abandoned_carts SET reminded_at = now() WHERE user_id = ${c.user_id}`;
        sent++;
      } else {
        failed++;
      }
    }
    return Response.json({ ok: true, candidates: candidates.length, sent, failed });
  } catch (err) {
    console.error("[cron/abandoned-carts]", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
