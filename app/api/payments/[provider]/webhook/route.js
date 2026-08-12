// app/api/payments/[provider]/webhook/route.js
import sql from "@/lib/db";
import { getProvider } from "@/lib/payment/provider";

/**
 * POST /api/payments/[provider]/webhook
 * Reçoit les notifications de paiement du fournisseur.
 *
 * 🔒 SÉCURITÉ :
 * - Vérifie la signature HMAC (fournisseur → nous)
 * - Idempotence : transaction_id UNIQUE en base (deux webhooks = un seul effet)
 * - Machine à états stricte : pending → paid (jamais paid → paid)
 *
 * ⚠️ IMPORTANT : Next.js 15 — on lit rawBody pour la signature AVANT de parser JSON.
 */
export async function POST(request, { params }) {
  const { provider: providerName } = await params;

  try {
    // 🔒 1) Obtient l'adaptateur (doit correspondre à l'URL)
    const provider = getProvider();
    if (provider.name !== providerName) {
      return Response.json({ error: "Fournisseur inconnu." }, { status: 404 });
    }
    const { adapter } = provider;

    // 🔒 2) Lit le body BRUT pour vérification de signature
    const rawBody = await request.text();
    const signatureHeader =
      request.headers.get("x-signature") ||
      request.headers.get("x-hub-signature-256") ||
      request.headers.get("x-ligdicash-signature") ||
      request.headers.get("x-cinetpay-signature") ||
      "";

    // 🔒 3) Vérifie la signature (rejette les webhooks falsifiés)
    const signatureValid = await adapter.verifyWebhookSignature(rawBody, signatureHeader);
    if (!signatureValid) {
      console.warn(`[webhook/${providerName}] Signature invalide`);
      return Response.json({ error: "Signature invalide." }, { status: 403 });
    }

    // 🔒 4) Parse l'événement
    const body = JSON.parse(rawBody);
    const event = await adapter.parseWebhookEvent(body);

    if (!event.transactionId) {
      console.warn(`[webhook/${providerName}] transaction_id manquant`, body);
      return Response.json({ error: "transaction_id manquant." }, { status: 400 });
    }

    // 🔒 5) Cherche le payment en base
    const [payment] = await sql`
      SELECT id, order_id, status, amount
      FROM payments
      WHERE transaction_id = ${event.transactionId}
    `;

    if (!payment) {
      // Webhook pour un transaction_id inconnu → on log et on retourne 200
      // (certains fournisseurs réessaient, on ne veut pas qu'ils spam)
      console.warn(`[webhook/${providerName}] transaction_id inconnu: ${event.transactionId}`);
      return Response.json({ received: true });
    }

    // 🔒 6) IDEMPOTENCE : si déjà traité, on répond juste 200
    if (payment.status === "success" || payment.status === "failed") {
      return Response.json({ received: true, alreadyProcessed: true });
    }

    // 🔒 7) Vérifie cohérence montant
    if (event.amount !== undefined && Math.abs(Number(event.amount) - Number(payment.amount)) > 1) {
      console.error(`[webhook/${providerName}] Montant incohérent`, {
        expected: payment.amount,
        received: event.amount,
      });
      await sql`
        UPDATE payments
        SET status = 'failed',
            raw_response = ${JSON.stringify({ ...body, error: "amount_mismatch" })}::jsonb,
            updated_at = NOW()
        WHERE id = ${payment.id}
      `;
      return Response.json({ error: "Montant incohérent." }, { status: 400 });
    }

    // 🔒 8) Machine à états : applique le statut
    const newStatus = event.status === "success" ? "success" : "failed";

    await sql`
      UPDATE payments
      SET status = ${newStatus},
          raw_response = ${JSON.stringify(body)}::jsonb,
          updated_at = NOW()
      WHERE id = ${payment.id}
    `;

    // 🔒 9) Si succès : met à jour la commande en 'paid' (idempotent car WHERE status = 'pending')
    if (newStatus === "success") {
      await sql`
        UPDATE orders
        SET status = 'paid', updated_at = NOW()
        WHERE id = ${payment.order_id} AND status = 'pending'
      `;

      // Audit log succès
      await sql`
        INSERT INTO security_audit_log (action, resource_type, resource_id, ip_address)
        VALUES ('payment_success', 'payment', ${payment.id}, ${providerName})
      `.catch(() => {});
    } else {
      // Audit log échec
      await sql`
        INSERT INTO security_audit_log (action, resource_type, resource_id, ip_address)
        VALUES ('payment_failed', 'payment', ${payment.id}, ${providerName})
      `.catch(() => {});
    }

    return Response.json({ received: true, status: newStatus });
  } catch (err) {
    console.error(`[webhook/${providerName}] Erreur:`, err);
    // Retourne 200 pour éviter que le fournisseur spam
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
