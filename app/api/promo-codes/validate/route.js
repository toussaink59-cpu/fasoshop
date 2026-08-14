import sql from "@/lib/db";

// POST /api/promo-codes/validate — validation publique (panier)
// Body: { code: "BIENVENUE10", amount: 15000 }
export async function POST(request) {
  try {
    const body = await request.json();
    const { code, amount } = body;

    if (!code || typeof amount !== "number" || amount < 0) {
      return Response.json({ valid: false, error: "Paramètres invalides." }, { status: 400 });
    }

    const [c] = await sql`
      SELECT * FROM promo_codes
      WHERE code = ${String(code).trim().toUpperCase()} AND active = true
    `;

    if (!c) return Response.json({ valid: false, error: "Code invalide ou désactivé." });
    if (c.valid_from && new Date(c.valid_from) > new Date()) return Response.json({ valid: false, error: "Code pas encore actif." });
    if (c.valid_until && new Date(c.valid_until) < new Date()) return Response.json({ valid: false, error: "Code expiré." });
    if (c.usage_limit && c.usage_count >= c.usage_limit) return Response.json({ valid: false, error: "Code épuisé." });
    if (amount < Number(c.min_order_amount)) {
      return Response.json({ valid: false, error: `Montant minimum : ${Number(c.min_order_amount).toLocaleString("fr-FR")} FCFA.` });
    }

    // Calcul de la remise (jamais négative, jamais > total)
    let discount = c.type === "percentage" ? amount * (Number(c.value) / 100) : Number(c.value);
    if (c.type === "percentage" && c.max_discount) discount = Math.min(discount, Number(c.max_discount));
    discount = Math.min(Math.round(discount), amount);

    return Response.json({
      valid: true,
      code: c.code,
      type: c.type,
      value: Number(c.value),
      discount,
    });
  } catch {
    return Response.json({ valid: false, error: "Erreur serveur." }, { status: 500 });
  }
}