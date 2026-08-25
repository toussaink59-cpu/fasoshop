// app/api/payments/[provider]/webhook/route.js
import sql from "@/lib/db";
import { getProvider } from "@/lib/payment/provider";
import { sendMail, emailTemplates } from "@/lib/email";

export async function POST(request, { params }) {
  const { provider: providerName } = await params;
  try {
    const provider = getProvider();
    if (provider.name !== providerName) return Response.json({ error: "Fournisseur inconnu." }, { status: 404 });
    const { adapter } = provider;

    const rawBody = await request.text();
    const signatureHeader = request.headers.get("x-signature") || request.headers.get("x-hub-signature-256") || request.headers.get("x-ligdicash-signature") || request.headers.get("x-cinetpay-signature") || "";
    const signatureValid = await adapter.verifyWebhookSignature(rawBody, signatureHeader);
    if (!signatureValid) {
      console.warn(`[webhook/${providerName}] Signature invalide`);
      return Response.json({ error: "Signature invalide." }, { status: 403 });
    }

    const body = JSON.parse(rawBody);
    const event = await adapter.parseWebhookEvent(body);
    if (!event.transactionId) {
      console.warn(`[webhook/${providerName}] transaction_id manquant`, body);
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
      const [sr] = await sql`SELECT id, product_id, duration_days, status FROM sponsorship_requests WHERE id = ${sponsorId}`;
      if (!sr) {
        console.warn(`[webhook] Sponsoring #${sponsorId} introuvable`);
        return Response.json({ received: true });
      }
      if (sr.status === "approved" || sr.status === "rejected") {
        return Response.json({ received: true, alreadyProcessed: true });
      }
      if (event.status === "success") {
        const days = sr.duration_days || 30;
        await sql`UPDATE sponsorship_requests SET status = 'approved', reviewed_at = NOW() WHERE id = ${sr.id}`;
        await sql`UPDATE products SET is_sponsored = true, sponsored_until = NOW() + (${days} || ' days')::interval WHERE id = ${sr.product_id}`;
        console.log(`[webhook] Sponsoring #${sr.id} ACTIVÉ (${days}j)`);
      } else if (event.status === "failed") {
        await sql`UPDATE sponsorship_requests SET status = 'rejected', admin_notes = 'Paiement échoué', reviewed_at = NOW() WHERE id = ${sr.id}`;
        console.log(`[webhook] Sponsoring #${sr.id} paiement échoué`);
      }
      return Response.json({ received: true, sponsor: true, status: event.status });
    }

    // === BRANCHE COMMANDES ===
    const [payment] = await sql`SELECT id, order_id, status, amount FROM payments WHERE transaction_id = ${event.transactionId}`;
    if (!payment) {
      console.warn(`[webhook/${providerName}] transaction_id inconnu: ${event.transactionId}`);
      return Response.json({ received: true });
    }
    if (payment.status === "success" || payment.status === "failed") {
      return Response.json({ received: true, alreadyProcessed: true });
    }
    if (event.amount !== undefined && Math.abs(Number(event.amount) - Number(payment.amount)) > 1) {
      console.error(`[webhook/${providerName}] Montant incohérent`, { expected: payment.amount, received: event.amount });
      await sql`UPDATE payments SET status = 'failed', raw_response = ${JSON.stringify({ ...body, error: "amount_mismatch" })}::jsonb, updated_at = NOW() WHERE id = ${payment.id}`;
      return Response.json({ error: "Montant incohérent." }, { status: 400 });
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
    return Response.json({ received: true, status: newStatus });
  } catch (err) {
    console.error(`[webhook/${providerName}] Erreur:`, err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
