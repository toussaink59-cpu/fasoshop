import { Resend } from "resend";
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM || "Kimoxa <no-reply@kimoxa.com>";
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://kimoxa.com";

// 🔒 Défense en profondeur (V-01) : même si les données sont désormais
// re-résolues depuis la table products avant d'arriver ici (voir
// app/api/cron/abandoned-carts/route.js), on échappe systématiquement tout
// ce qui est interpolé dans du HTML brut — un nom de produit ou un nom
// d'utilisateur ne doivent jamais pouvoir casser hors d'un attribut/texte.
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// N'autorise que des URLs d'images https:// (jamais data:, javascript:, etc.)
function safeImageUrl(url) {
  if (typeof url !== "string") return "";
  if (!/^https:\/\//i.test(url)) return "";
  return escapeHtml(url);
}

export async function sendAbandonedCartEmail(to, name, items, totalCents) {
  if (!resend) {
    console.warn("[abandoned-cart] RESEND_API_KEY non configure, email simule");
    return { ok: true, messageId: "simulated" };
  }
  const totalFormatted = Number(totalCents).toLocaleString("fr-FR");
  const firstName = escapeHtml((name || "").split(" ")[0] || "Client");
  const displayItems = items.slice(0, 4);
  const itemsHtml = displayItems
    .map((it) => {
      const safeName = escapeHtml(it.name);
      const safeImg = safeImageUrl(it.image);
      return `<tr>
      <td style="padding:12px 0; border-bottom:1px solid #eee;">
        <div style="display:flex; align-items:center; gap:12px;">
          ${safeImg ? `<img src="${safeImg}" alt="${safeName}" style="width:50px; height:50px; object-fit:cover; border-radius:6px;">` : ""}
          <div>
            <div style="font-weight:600; color:#241712;">${safeName}</div>
            <div style="color:#888; font-size:13px;">Quantite: ${Number(it.quantity) || 1} — ${Number(it.price).toLocaleString("fr-FR")} F</div>
          </div>
        </div>
      </td>
    </tr>`;
    })
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
