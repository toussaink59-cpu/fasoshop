export const runtime = "nodejs";
// app/api/payments/[provider]/webhook/route.js
import sql from "@/lib/db";
import { getProvider } from "@/lib/payment/provider";
import { sendMail, emailTemplates } from "@/lib/email";
import { logger, generateRequestId } from "@/lib/logger";

export async function POST(request, { params }) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  const { provider: providerName } = await params;
  try {
    const provider = getProvider();
    if (provider.name !== providerName) return Response.json({ error: "Fournisseur inconnu." }, { status: 404 });
    const { adapter } = provider;

    const rawBody = await request.text();
    const signatureHeader = request.headers.get("x-signature") || request.headers.get("x-hub-signature-256") || request.headers.get("x-ligdicash-signature") || request.headers.get("x-cinetpay-signature") || "";
    const signatureValid = await adapter.verifyWebhookSignature(rawBody, signatureHeader);
    if (!signatureValid) {
      logger.warn("Webhook signature invalid", {
        route: "/api/payments/" + providerName + "/webhook",
        method: "POST",
        request_id: requestId,
        provider: providerName,
        duration_ms: Date.now() - startTime,
      });
      return Response.json({ error: "Signature invalide." }, { status: 403 });
    }

    const body = JSON.parse(rawBody);
    const event = await adapter.parseWebhookEvent(body);
    if (!event.transactionId) {
      logger.warn("Webhook missing transaction_id", {
        route: "/api/payments/" + providerName + "/webhook",
        method: "POST",
        request_id: requestId,
        provider: providerName,
        body_preview: JSON.stringify(body).slice(0, 200),
        duration_ms: Date.now() - startTime,
      });
      return Response.json({ error: "transaction_id manquant." }, { status: 400 });
    }

    // === BRANCHE SPONSORING (EN PREMIER) ===
    if (String(event.transactionId).startsWith("KMX-SPONSOR-")) {
      const match = String(event.transactionId).match(/^KMX-SPONSOR-(\\d+)-/);
      const sponsorId = match ? match[1] : null;
      if (!sponsorId) {
        console.warn(`[webhook] ID sponsoring illisible: ${event.transactionId}`);
        return Response.json({ received: true });
      }
      const [sr] = await sql`SELECT id, product_id, duration_days, price_fcfa, status FROM sponsorship_requests WHERE id = ${sponsorId} FOR UPDATE`;
      if (!sr) {
        console.warn(`[webhook] Sponsoring #${sponsorId} introuvable`);
        return Response.json({ received: true });
      }
      if (sr.status === "approved" || sr.status === "rejected") {
        return Response.json({ received: true, alreadyProcessed: true });
      }

      // P0 : vérification stricte du montant payé vs prix du sponsoring
      const receivedAmount = Number(event.amount);
      const expectedAmount = Number(sr.price_fcfa);
      if (!Number.isFinite(receivedAmount) || !Number.isFinite(expectedAmount) || Math.abs(receivedAmount - expectedAmount) > 1) {
        console.error(`[webhook] Montant sponsoring incohérent`, { expected: expectedAmount, received: receivedAmount, sponsorId });
        await sql`UPDATE sponsorship_requests SET status = 'rejected', admin_notes = 'Montant incohérent', reviewed_at = NOW() WHERE id = ${sr.id} AND status = 'pending'`;
        return Response.json({ error: "Montant incohérent." }, { status: 400 });
      }

      // P0 : activation atomique (transaction) pour éviter les doubles traitements
      try {
        await sql.begin(async (tx) => {
          await tx`UPDATE sponsorship_requests SET status = 'approved', reviewed_at = NOW() WHERE id = ${sr.id} AND status = 'pending'`;
          // 🔒 Corrige un bug qui empêchait TOUTE activation de sponsoring
          // même après le correctif du statut 'pending' : NOW() + ('${jours}
          // days')::interval imbrique le paramètre DANS des guillemets simples,
          // ce que PostgreSQL ne sait pas typer ("could not determine data
          // type of parameter $1") — la transaction entière échouait et
          // annulait aussi la mise à jour de statut. Vérifié avec une vraie
          // requête PostgreSQL : la multiplication entier * INTERVAL fonctionne.
          await tx`UPDATE products SET is_sponsored = true, sponsored_until = NOW() + (${Number(sr.duration_days || 30)} * INTERVAL '1 day') WHERE id = ${sr.product_id}`;
        });
      } catch (txErr) {
        console.error(`[webhook] Erreur transaction sponsoring #${sr.id}`, txErr.message);
        return Response.json({ error: "Erreur serveur." }, { status: 500 });
      }
      return Response.json({ received: true });
    }

    // === BRANCHE COMMANDES ===
    const [payment] = await sql`SELECT id, order_id, status, amount, provider FROM payments WHERE transaction_id = ${event.transactionId} FOR UPDATE`;
    if (!payment) {
      console.warn(`[webhook/${providerName}] transaction_id inconnu: ${event.transactionId}`);
      return Response.json({ received: true });
    }
    if (payment.status === "success" || payment.status === "failed") {
      return Response.json({ received: true, alreadyProcessed: true });
    }
    if (payment.provider && payment.provider !== providerName) {
      console.error(`[webhook] Fournisseur incohérent pour ${event.transactionId}`, { expected: payment.provider, got: providerName });
      return Response.json({ error: "Fournisseur incohérent." }, { status: 400 });
    }
    if (event.amount !== undefined && Math.abs(Number(event.amount) - Number(payment.amount)) > 1) {
      console.error(`[webhook/${providerName}] Montant incohérent pour transaction ${event.transactionId}`);
      await sql`UPDATE payments SET status = 'failed', raw_response = ${JSON.stringify({ ...body, error: "amount_mismatch" })}::jsonb, updated_at = NOW() WHERE id = ${payment.id}`;
      return Response.json({ error: "Montant incohérent." }, { status: 400 });
    }
    if (!["success", "failed"].includes(String(event.status))) {
      console.warn(`[webhook/${providerName}] Statut non reconnu: ${event.status}`);
      return Response.json({ error: "Statut non reconnu." }, { status: 400 });
    }
    const newStatus = event.status === "success" ? "success" : "failed";
    await sql`UPDATE payments SET status = ${newStatus}, raw_response = ${JSON.stringify(body)}::jsonb, updated_at = NOW() WHERE id = ${payment.id}`;
    if (newStatus === "success") {
      await sql`UPDATE orders SET status = 'paid' WHERE id = ${payment.order_id} AND status = 'pending'`;
      try {
        const [orderInfo] = await sql`SELECT o.id, o.total, u.email FROM orders o JOIN users u ON u.id = o.buyer_id WHERE o.id = ${payment.order_id}`;
        if (orderInfo?.email) {
          const tpl = emailTemplates.paymentSuccess({ orderId: orderInfo.id, amount: Number(orderInfo.total).toLocaleString("fr-FR") });
          await sendMail({ to: orderInfo.email, subject: tpl.subject, html: tpl.html });
        }
      } catch (emailErr) { console.error("[webhook] Email non envoyé:", emailErr.message); }
      await sql`INSERT INTO security_audit_log (action, resource_type, resource_id, ip_address) VALUES ('payment_success', 'payment', ${payment.id}, ${providerName})`.catch(() => {});
    } else {
      await sql`INSERT INTO security_audit_log (action, resource_type, resource_id, ip_address) VALUES ('payment_failed', 'payment', ${payment.id}, ${providerName})`.catch(() => {});
    }
    logger.info("Webhook processed", {
      route: "/api/payments/" + providerName + "/webhook",
      method: "POST",
      request_id: requestId,
      provider: providerName,
      transaction_id: event.transactionId,
      status: newStatus,
      duration_ms: Date.now() - startTime,
    });
    return Response.json({ received: true, status: newStatus });
  } catch (err) {
    logger.error("Webhook processing failed", {
      route: "/api/payments/" + providerName + "/webhook",
      method: "POST",
      request_id: requestId,
      provider: providerName,
      error: err.message,
      duration_ms: Date.now() - startTime,
    });
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
