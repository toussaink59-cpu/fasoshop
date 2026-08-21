// app/api/orders/[id]/pay/route.js
import sql from "@/lib/db";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { getProvider } from "@/lib/payment/provider";

// POST /api/orders/[id]/pay
// Initie un paiement en ligne via le fournisseur actif (Ligdicash / CinetPay / Sandbox).
// Architecture agnostique : switch via PAYMENT_PROVIDER env var.
export async function POST(request, { params }) {
  const userId = request.headers.get("x-user-id");
  const { id: orderId } = await params;

 // 1) Rate limit : max 3 initiations par minute par utilisateur
  const key = `pay:${userId}:${clientKey(request)}`;
  if (!(await rateLimit(key, { limit: 3, windowMs: 60_000 }))) {
    return Response.json(
      { error: "Trop de tentatives de paiement. Réessayez dans une minute." },
      { status: 429 }
    );
  }

  try {
 // 2) Vérifications strictes dans une seule requête
    const [order] = await sql`
      SELECT id, buyer_id, total, status, payment_method, phone, expires_at
      FROM orders
      WHERE id = ${orderId}
    `;

    if (!order || String(order.buyer_id) !== String(userId)) {
      return Response.json({ error: "Commande introuvable." }, { status: 404 });
    }
    if (order.payment_method !== "mobile_money") {
      return Response.json(
        { error: "Cette commande n'est pas configurée pour un paiement en ligne." },
        { status: 400 }
      );
    }
    if (order.status !== "pending") {
      return Response.json(
        { error: "Cette commande a déjà été traitée." },
        { status: 400 }
      );
    }
    if (order.expires_at && new Date(order.expires_at) < new Date()) {
      return Response.json(
        { error: "Cette commande a expiré. Veuillez en créer une nouvelle." },
        { status: 400 }
      );
    }

 // 3) Obtient l'adaptateur actif
    const { name: providerName, adapter } = getProvider();

 // 4) transaction_id unique (idempotence côté webhook garantie par contrainte UNIQUE)
    const transactionId = `KMX-${order.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const baseUrl = process.env.APP_BASE_URL || new URL(request.url).origin;

 // 5) Appel à l'adaptateur
    const { paymentUrl, providerData } = await adapter.initiate({
      transactionId,
      amount: order.total,
      description: `Commande Kimoxa #${order.id}`,
      customerPhoneNumber: order.phone,
      notifyUrl: `${baseUrl}/api/payments/${providerName}/webhook`,
 // CORRECTION : retour vers ?paid=XX pour afficher la bannière verte "Paiement réussi"
      returnUrl: `${baseUrl}/orders?paid=${order.id}`,
      orderId: order.id,
    });

    if (!paymentUrl) {
      throw new Error("Le fournisseur n'a pas retourné d'URL de paiement.");
    }

 // 6) INSERT du payment (transaction_id UNIQUE protège contre les doublons)
    await sql`
      INSERT INTO payments (order_id, provider, transaction_id, status, amount, raw_response)
      VALUES (
        ${order.id},
        ${providerName},
        ${transactionId},
        'initiated',
        ${order.total},
        ${JSON.stringify(providerData)}::jsonb
      )
    `;

 // 7) Audit log
    await sql`
      INSERT INTO security_audit_log (user_id, action, resource_type, resource_id, ip_address)
      VALUES (${userId}, 'payment_initiated', 'payment', ${order.id}, ${clientKey(request)})
    `.catch(() => {});

    return Response.json({ paymentUrl, provider: providerName });
  } catch (err) {
    console.error("[orders/pay] Erreur initiation paiement:", err);
    return Response.json(
      { error: err.message || "Erreur lors de l'initiation du paiement." },
      { status: 500 }
    );
  }
}
