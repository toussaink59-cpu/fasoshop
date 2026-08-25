import sql from "@/lib/db";
import { SPONSOR_PACKS, getSponsorPack } from "@/lib/sponsorship.js";

// POST /api/vendor/products/[id]/sponsor
// body: { durationDays: 30 | 90 | 180 | 365 }
export async function POST(request, { params }) {
  const userId = request.headers.get("x-user-id");
  const { id: productId } = await params;

  try {
    const { durationDays } = await request.json().catch(() => ({}));
    const pack = getSponsorPack(durationDays);
    if (!pack) {
      return Response.json({ error: "Pack de sponsoring invalide." }, { status: 400 });
    }

    const [product] = await sql`
      SELECT p.id, p.name, p.is_sponsored, p.sponsored_until, s.id AS shop_id, s.vendor_id
      FROM products p
      JOIN shops s ON s.id = p.shop_id
      WHERE p.id = ${productId}
    `;

    if (!product) {
      return Response.json({ error: "Produit introuvable." }, { status: 404 });
    }
    if (String(product.vendor_id) !== String(userId)) {
      return Response.json({ error: "Ce produit n'appartient pas à votre boutique." }, { status: 403 });
    }
    if (product.is_sponsored && product.sponsored_until && new Date(product.sponsored_until) > new Date()) {
      return Response.json({ error: "Ce produit est déjà sponsorisé." }, { status: 400 });
    }

    const [existing] = await sql`
      SELECT id FROM sponsorship_requests WHERE product_id = ${productId} AND status = 'pending'
    `;
    if (existing) {
      return Response.json({ error: "Une demande est déjà en attente pour ce produit." }, { status: 400 });
    }

    const [request_] = await sql`
      INSERT INTO sponsorship_requests (product_id, shop_id, status, duration_days, price_fcfa)
      VALUES (${productId}, ${product.shop_id}, 'pending', ${pack.durationDays}, ${pack.priceFcfa})
      RETURNING id, status, duration_days, price_fcfa, requested_at
    `;

    return Response.json({ request: request_ }, { status: 201 });
  } catch (err) {
    console.error("Erreur demande sponsoring:", err);
    return Response.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
