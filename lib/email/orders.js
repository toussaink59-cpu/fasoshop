import { Resend } from "resend";
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM || "Kimoxa <no-reply@kimoxa.com>";
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://fasoshop.vercel.app";

// 🎨 Design system Kimoxa (cohérent avec abandoned-cart.js)
const BRAND = {
  primary: "#241712",
  accent: "#e6a623",
  muted: "#888",
  border: "#eee",
  font: 'system-ui, -apple-system, sans-serif',
};

function wrap(content, title) {
  return `
    <div style="font-family: ${BRAND.font}; max-width: 600px; margin: 0 auto; background: #fff; color: ${BRAND.primary};">
      <div style="background: linear-gradient(135deg, ${BRAND.primary} 0%, #3d2817 100%); padding: 28px 24px; text-align: center;">
        <h1 style="color: #fff; margin: 0; font-size: 22px; letter-spacing: 0.3px;">${title}</h1>
        <p style="color: rgba(255,255,255,0.75); margin: 6px 0 0 0; font-size: 13px;">Kimoxa — l'Afrique qui vend à l'Afrique qui achète</p>
      </div>
      <div style="padding: 28px 24px;">
        ${content}
        <p style="color: ${BRAND.muted}; font-size: 12px; line-height: 1.5; margin-top: 32px; padding-top: 20px; border-top: 1px solid ${BRAND.border};">
          Cet email a été envoyé automatiquement par Kimoxa.<br>
          En cas de question : <a href="mailto:support@kimoxa.com" style="color: ${BRAND.primary};">support@kimoxa.com</a><br>
          Kimoxa · SO.SA.KA.F Sarl
        </p>
      </div>
    </div>
  `;
}

function itemsTable(items) {
  return `
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      ${items.map(it => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid ${BRAND.border}; color: ${BRAND.primary};">
            <strong>${it.name}</strong> × ${it.quantity}
          </td>
          <td style="padding: 10px 0; border-bottom: 1px solid ${BRAND.border}; text-align: right; color: ${BRAND.primary};">
            ${Number(it.price * it.quantity).toLocaleString("fr-FR")} F
          </td>
        </tr>
      `).join("")}
    </table>
  `;
}

function ctaButton(label, href) {
  return `<a href="${href}" style="display: block; background: ${BRAND.accent}; color: ${BRAND.primary}; text-decoration: none; padding: 14px; border-radius: 8px; text-align: center; font-weight: 600; font-size: 15px; margin: 20px 0;">${label} →</a>`;
}

// 🔥 FIRE-AND-FORGET : ne jamais bloquer l'appelant sur une panne Resend
async function safeSend(to, subject, html) {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY non configure, email simule");
    return { ok: true, messageId: "simulated" };
  }
  try {
    const { data, error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) throw error;
    return { ok: true, messageId: data?.id };
  } catch (err) {
    console.error("[email] Resend error:", err.message);
    return { ok: false, error: err.message };
  }
}

// 💳 1) CONFIRMATION PAIEMENT (envoyée par webhook provider, pas par /pay)
export async function sendOrderPaidEmail({ to, firstName, orderId, total, items, paymentMethod }) {
  const html = wrap(`
    <p style="font-size: 16px; line-height: 1.6; color: ${BRAND.primary};">
      Bonjour ${firstName} 👋<br>
      <strong>Votre paiement a été confirmé !</strong> Votre commande est en cours de préparation.
    </p>
    <div style="background: #f9f6f1; padding: 16px; border-radius: 8px; margin: 20px 0;">
      <div style="color: ${BRAND.muted}; font-size: 12px;">Commande n°</div>
      <div style="font-size: 20px; font-weight: 700; color: ${BRAND.primary};">#${orderId}</div>
      <div style="color: ${BRAND.muted}; font-size: 12px; margin-top: 8px;">Payée par</div>
      <div style="color: ${BRAND.primary};">${paymentMethod === "mobile_money" ? "Mobile Money" : paymentMethod}</div>
    </div>
    ${itemsTable(items)}
    <div style="font-size: 18px; font-weight: 700; text-align: right; color: ${BRAND.primary};">
      Total : ${Number(total).toLocaleString("fr-FR")} F CFA
    </div>
    ${ctaButton("Suivre ma commande", BASE_URL + "/orders")}
  `, "✅ Paiement confirmé");
  return safeSend(to, `✅ Commande #${orderId} confirmée — Kimoxa`, html);
}

// 🚚 2) EXPÉDITION (déclenchée par vendor PATCH → shipped)
export async function sendOrderShippedEmail({ to, firstName, orderId, shopName }) {
  const html = wrap(`
    <p style="font-size: 16px; line-height: 1.6; color: ${BRAND.primary};">
      Bonjour ${firstName} 👋<br>
      <strong>${shopName} vient d'expédier votre commande !</strong> Elle est en route vers vous.
    </p>
    <div style="background: #f9f6f1; padding: 16px; border-radius: 8px; margin: 20px 0;">
      <div style="color: ${BRAND.muted}; font-size: 12px;">Commande</div>
      <div style="font-size: 20px; font-weight: 700; color: ${BRAND.primary};">#${orderId}</div>
      <div style="color: ${BRAND.muted}; font-size: 12px; margin-top: 8px;">Vendeur</div>
      <div style="color: ${BRAND.primary};">${shopName}</div>
    </div>
    <p style="color: ${BRAND.primary}; line-height: 1.6;">
      Vous disposez de <strong>7 jours</strong> après la réception pour signaler un problème. 
      Passé ce délai, le paiement sera libéré au vendeur.
    </p>
    ${ctaButton("Voir ma commande", BASE_URL + "/orders")}
  `, "🚚 Votre commande est en route !");
  return safeSend(to, `🚚 Commande #${orderId} expédiée — Kimoxa`, html);
}

// ✅ 3) LIVRAISON (déclenchée par confirm-receipt OU auto-confirm cron)
export async function sendOrderDeliveredEmail({ to, firstName, orderId, shopName, autoConfirmed = false }) {
  const reasonText = autoConfirmed
    ? "Votre commande a été marquée comme livrée automatiquement (délai de 7 jours écoulé)."
    : "Vous avez confirmé la réception de votre commande. Merci de votre confiance !";
  const html = wrap(`
    <p style="font-size: 16px; line-height: 1.6; color: ${BRAND.primary};">
      Bonjour ${firstName} 👋<br>
      <strong>Commande #${orderId} livrée ✅</strong>
    </p>
    <div style="background: #f9f6f1; padding: 16px; border-radius: 8px; margin: 20px 0;">
      <div style="color: ${BRAND.muted}; font-size: 12px;">Vendeur</div>
      <div style="color: ${BRAND.primary}; font-weight: 600;">${shopName}</div>
    </div>
    <p style="color: ${BRAND.primary}; line-height: 1.6;">${reasonText}</p>
    <p style="color: ${BRAND.primary}; line-height: 1.6;">
      Un problème avec votre commande ? Contactez-nous rapidement : 
      <a href="mailto:support@kimoxa.com" style="color: ${BRAND.primary}; font-weight: 600;">support@kimoxa.com</a>
    </p>
    ${ctaButton("Noter le vendeur", BASE_URL + "/orders")}
  `, "✅ Commande livrée");
  return safeSend(to, `✅ Commande #${orderId} livrée — Kimoxa`, html);
}
