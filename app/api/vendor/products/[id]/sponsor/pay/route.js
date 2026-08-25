import sql from "@/lib/db";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { getProvider } from "@/lib/payment/provider";
import { getSponsorPack } from "@/lib/sponsorship";

// POST /api/vendor/products/[id]/sponsor/pay
// Initie le paiement Ligdicash/CinetPay pour un pack de sponsoring.
// body: { durationDays, phone }
export async function POST(request, { params }) {
  const userId = request.headers.get("x-user-id");
  const { id: productId } = await params;

  const key = `sponsor-pay:${userId}:${clientKey(request)}`;
  if (!(await rateLimit(key, { limit: 3, windowMs: 60_000 }))) {
    return Response.json({ error: "Trop de tentatives. Réessayez dans une minute." }, { status: 429 });
  }

  try {
    const { durationDays, phone } = await request.json().catch(() => ({}));
    const pack = getSponsorPack(durationDays);
    if (!pack) return Response.json({ error: "Pack de sponsoring invalide." }, { status: 400 });
    if (!phone || phone.length < 8) return Response.json({ error: "Numéro de téléphone invalide." }, { status: 400 });

    const [product] = await sql`
      SELECT p.id, p.name, p.is_sponsored, p.sponsored_until, s.id AS shop_id, s.vendor_id
      FROM products p JOIN shops s ON s.id = p.shop_id
      WHERE p.id = ${productId}
    `;
    if (!product) return Response.json({ error: "Produit introuvable." }, { status: 404 });
    if (String(product.vendor_id) !== String(userId)) return Response.json({ error: "Ce produit n'appartient pas à votre boutique." }, { status: 403 });
    if (product.is_sponsored && product.sponsored_until && new Date(product.sponsored_until) > new Date()) {
      return Response.json({ error: "Ce produit est déjà sponsorisé." }, { status: 400 });
    }

    const [existing] = await sql`
      SELECT id FROM sponsorship_requests
      WHERE product_id = ${productId} AND status IN ('pending', 'paid', 'approved')
    `;
    if (existing) return Response.json({ error: "Une demande est déjà en cours pour ce produit." }, { status: 400 });

    const { name: providerName, adapter } = getProvider();
    const baseUrl = process.env.APP_BASE_URL || new URL(request.url).origin;

    const [inserted] = await sql`
      INSERT INTO sponsorship_requests (product_id, shop_id, status, duration_days, price_fcfa)
      VALUES (${productId}, ${product.shop_id}, 'paid', ${pack.durationDays}, ${pack.priceFcfa})
      RETURNING id
    `;

    const transactionId = `KMX-SPONSOR-${inserted.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const { paymentUrl, providerData } = await adapter.initiate({
      transactionId,
      amount: pack.priceFcfa,
      description: `Sponsoring Kimoxa ${pack.label} — ${product.name}`,
      customerPhoneNumber: phone,
      notifyUrl: `${baseUrl}/api/payments/${providerName}/webhook`,
      returnUrl: `${baseUrl}/vendor/dashboard?sponsor-paid=${inserted.id}`,
      orderId: null,
    });

    if (!paymentUrl) throw new Error("Le fournisseur n'a pas retourné d'URL de paiement.");

    await sql`
      UPDATE sponsorship_requests
      SET payment_id = ${transactionId}
      WHERE id = ${inserted.id}
    `;

    return Response.json({ paymentUrl, provider: providerName, requestId: inserted.id });
  } catch (err) {
    console.error("[sponsor/pay] Erreur:", err);
    return Response.json({ error: err.message || "Erreur lors de l'initiation du paiement." }, { status: 500 });
  }
}
