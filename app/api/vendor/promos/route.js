import sql from "@/lib/db";

export async function GET(request) {
  const vendorId = request.headers.get("x-user-id");
  const rows = await sql`
    SELECT p.*, s.name AS shop_name
    FROM promo_codes p
    JOIN shops s ON s.id = p.shop_id
    WHERE s.vendor_id = ${vendorId}
    ORDER BY p.created_at DESC
  `;
  return Response.json({ promos: rows });
}

export async function POST(request) {
  const vendorId = request.headers.get("x-user-id");
  const body = await request.json().catch(() => ({}));
  const { code, discount_type, discount_value, min_amount, max_uses, expires_at } = body;

  if (!code || code.length < 3 || code.length > 20) return Response.json({ error: "Code entre 3 et 20 caractères." }, { status: 400 });
  if (!["percent", "fixed"].includes(discount_type)) return Response.json({ error: "Type de remise invalide." }, { status: 400 });
  if (!discount_value || discount_value <= 0) return Response.json({ error: "Valeur de remise invalide." }, { status: 400 });
  if (discount_type === "percent" && discount_value > 90) return Response.json({ error: "Remise max 90%." }, { status: 400 });

  const [shop] = await sql`SELECT id FROM shops WHERE vendor_id = ${vendorId}`;
  if (!shop) return Response.json({ error: "Boutique introuvable." }, { status: 404 });

  try {
    const [created] = await sql`
      INSERT INTO promo_codes (shop_id, code, discount_type, discount_value, min_amount, max_uses, expires_at)
      VALUES (${shop.id}, ${code.toUpperCase()}, ${discount_type}, ${discount_value}, ${min_amount || 0}, ${max_uses || null}, ${expires_at || null})
      RETURNING *
    `;
    return Response.json({ promo: created });
  } catch (e) {
    if (e.message && e.message.includes("duplicate")) return Response.json({ error: "Ce code existe déjà." }, { status: 400 });
    throw e;
  }
}

export async function DELETE(request) {
  const vendorId = request.headers.get("x-user-id");
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return Response.json({ error: "ID manquant." }, { status: 400 });

  const [shop] = await sql`SELECT id FROM shops WHERE vendor_id = ${vendorId}`;
  if (!shop) return Response.json({ error: "Boutique introuvable." }, { status: 404 });

  await sql`DELETE FROM promo_codes WHERE id = ${id} AND shop_id = ${shop.id}`;
  return Response.json({ ok: true });
}
