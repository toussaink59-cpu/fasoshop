import sql from "@/lib/db";

// POST /api/promos/validate
// body: { code, items: [{ product_id, shop_id, quantity, unit_price }] }
// retourne : { valid, discount_total, per_shop: { shop_id: discount } }
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { code, items } = body;

  if (!code || !items || !Array.isArray(items)) {
    return Response.json({ valid: false, error: "Données invalides." }, { status: 400 });
  }

  const [promo] = await sql`
    SELECT * FROM promo_codes WHERE code = ${code.toUpperCase()} AND active = true
  `;

  if (!promo) return Response.json({ valid: false, error: "Code promo invalide." });
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) return Response.json({ valid: false, error: "Code expiré." });
  if (promo.max_uses && promo.used_count >= promo.max_uses) return Response.json({ valid: false, error: "Code épuisé." });

  // Filtrer les items qui appartiennent au shop du promo
  const shopItems = items.filter(i => Number(i.shop_id) === Number(promo.shop_id));
  if (shopItems.length === 0) return Response.json({ valid: false, error: "Ce code n'est pas valable pour ces produits." });

  const shopSubtotal = shopItems.reduce((sum, i) => sum + Number(i.unit_price) * Number(i.quantity), 0);
  if (promo.min_amount && shopSubtotal < promo.min_amount) {
    return Response.json({ valid: false, error: `Montant minimum requis : ${promo.min_amount.toLocaleString("fr-FR")} FCFA` });
  }

  let discount = 0;
  if (promo.discount_type === "percent") {
    discount = Math.round(shopSubtotal * promo.discount_value / 100);
  } else {
    discount = Math.min(promo.discount_value, shopSubtotal);
  }

  return Response.json({
    valid: true,
    promo_id: promo.id,
    promo_code: promo.code,
    discount,
    per_shop: { [promo.shop_id]: discount },
    label: promo.discount_type === "percent" ? `-${promo.discount_value}%` : `-${promo.discount_value.toLocaleString("fr-FR")} FCFA`,
  });
}
