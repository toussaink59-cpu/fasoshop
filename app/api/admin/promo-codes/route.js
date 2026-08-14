import sql from "@/lib/db";

// GET /api/admin/promo-codes — Liste tous les codes promo
export async function GET(request) {
  const userId = request.headers.get("x-user-id");
  const [user] = await sql`SELECT role FROM users WHERE id = ${userId}`;
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }

  const codes = await sql`
    SELECT id, code, type, value, min_order_amount, max_discount,
           usage_limit, usage_count, valid_from, valid_until, active, created_at
    FROM promo_codes
    ORDER BY created_at DESC
  `;

  return Response.json({ codes });
}

// POST /api/admin/promo-codes — Crée un nouveau code promo
export async function POST(request) {
  const userId = request.headers.get("x-user-id");
  const [user] = await sql`SELECT role FROM users WHERE id = ${userId}`;
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }

  const body = await request.json();
  const { code, type, value, min_order_amount, max_discount, usage_limit, valid_until } = body;

  if (!code || !type || !value) {
    return Response.json({ error: "Code, type et valeur sont requis." }, { status: 400 });
  }

  if (!["percentage", "fixed"].includes(type)) {
    return Response.json({ error: "Type invalide. Valeurs : percentage, fixed." }, { status: 400 });
  }

  if (value <= 0) {
    return Response.json({ error: "La valeur doit être positive." }, { status: 400 });
  }

  try {
    const [created] = await sql`
      INSERT INTO promo_codes (code, type, value, min_order_amount, max_discount, usage_limit, valid_until)
      VALUES (${code}, ${type}, ${value}, ${min_order_amount || 0}, ${max_discount || null}, ${usage_limit || null}, ${valid_until || null})
      RETURNING *
    `;

    return Response.json({ code: created }, { status: 201 });
  } catch (err) {
    if (err.message.includes("duplicate key")) {
      return Response.json({ error: "Ce code existe déjà." }, { status: 409 });
    }
    console.error("Erreur création promo:", err);
    return Response.json({ error: "Erreur lors de la création." }, { status: 500 });
  }
}