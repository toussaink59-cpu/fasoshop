import { Resend } from "resend";
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM || "Kimoxa <no-reply@kimoxa.com>";
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://fasoshop.vercel.app";

export async function sendAbandonedCartEmail(to, name, items, totalCents) {
  if (!resend) {
    console.warn("[abandoned-cart] RESEND_API_KEY non configure, email simule");
    return { ok: true, messageId: "simulated" };
  }
  const totalFormatted = (totalCents / 100).toLocaleString("fr-FR");
  const firstName = (name || "").split(" ")[0] || "Client";
  const displayItems = items.slice(0, 4);
  const itemsHtml = displayItems
    .map((it) => `<tr>
      <td style="padding:12px 0; border-bottom:1px solid #eee;">
        <div style="display:flex; align-items:center; gap:12px;">
          ${it.image ? `<img src="${it.image}" alt="${it.name}" style="width:50px; height:50px; object-fit:cover; border-radius:6px;">` : ""}
          <div>
            <div style="font-weight:600; color:#241712;">${it.name}</div>
            <div style="color:#888; font-size:13px;">Quantite: ${it.quantity} — ${(it.price / 100).toLocaleString("fr-FR")} F</div>
          </div>
        </div>
      </td>
    </tr>`)
    .join("");
  const extraCount = items.length - displayItems.length;
  const extraHtml = extraCount > 0
    ? `<tr><td style="padding:12px 0; color:#888; font-style:italic;">+ ${extraCount} autre(s) produit(s)</td></tr>`
    : "";
  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
      <div style="background: linear-gradient(135deg, #241712 0%, #3d2817 100%); padding: 32px 24px; text-align: center;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">Bonjour ${firstName} 👋</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0;">Vous avez oublie quelque chose dans votre panier</p>
      </div>
      <div style="padding: 32px 24px;">
        <p style="color: #241712; font-size: 16px; line-height: 1.6;">Vos produits vous attendent ! Ne les laissez pas s'echapper.</p>
        <table style="width: 100%; margin: 24px 0;">
          ${itemsHtml}
          ${extraHtml}
          <tr><td style="padding: 16px 0; font-size: 18px; font-weight: 700; color: #241712;">Total : ${totalFormatted} F CFA</td></tr>
        </table>
        <a href="${BASE_URL}/cart" style="display: block; background: #e6a623; color: #241712; text-decoration: none; padding: 16px; border-radius: 8px; text-align: center; font-weight: 600; font-size: 16px; margin: 24px 0;">Retour a mon panier →</a>
        <p style="color: #888; font-size: 13px; line-height: 1.5; margin-top: 32px; padding-top: 24px; border-top: 1px solid #eee;">Vous recevez cet email car vous avez ajoute des produits a votre panier sur Kimoxa.</p>
      </div>
    </div>
  `;
  try {
    const { data, error } = await resend.emails.send({
      from: FROM, to, subject: `🛒 ${firstName}, votre panier vous attend !`, html,
    });
    if (error) throw error;
    return { ok: true, messageId: data?.id };
  } catch (err) {
    console.error("[abandoned-cart] Resend error:", err.message);
    return { ok: false };
  }
}
