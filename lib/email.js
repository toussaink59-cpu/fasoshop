// lib/email.js
// Service d'envoi d'email via Resend (https://resend.com).
// 
// Variables d'env requises :
// - RESEND_API_KEY : clé API Resend (re_xxx)
// - EMAIL_FROM : expéditeur au format "Nom <email@domaine.com>"
//
// Fallback gracieux : si RESEND_API_KEY non défini, loggue en console
// (mode dev) sans bloquer le flux.
//
// Usage : import { sendMail } from "@/lib/email";
//         const result = await sendMail({ to, subject, text, html? });

import { Resend } from "resend";

// 🔧 Corrige V-05 : ces liens étaient auparavant codés en dur vers l'ancien
// domaine (fasoshop.vercel.app), indépendamment de l'environnement.
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://kimoxa.com";

/**
 * Envoie un email via Resend.
 * 
 * @param {object} params
 * @param {string} params.to - Email destinataire
 * @param {string} params.subject - Sujet
 * @param {string} [params.text] - Corps texte
 * @param {string} [params.html] - Corps HTML (prioritaire sur text)
 * @returns {Promise<{sent: boolean, id?: string, error?: string}>}
 */
export async function sendMail({ to, subject, text, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Kimoxa <onboarding@resend.dev>";

 // 1) Mode développement : pas de clé → log et retour
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY non défini — email non envoyé");
    console.log("[email stub] To:", to);
    console.log("[email stub] Subject:", subject);
    console.log("[email stub] Body:", html || text);
    return { sent: false, reason: "email_not_configured" };
  }

 // 2) Override mode développement : tous les emails vont vers l'email de test
  // (Resend en mode test n'autorise l'envoi que vers l'email du compte Resend)
    if (process.env.EMAIL_TEST_OVERRIDE === "true") {
    const testEmail = process.env.EMAIL_TEST_RECIPIENT || "fasoshop.marketplace@gmail.com";
    console.log(`[email] Override dev : ${to} → ${testEmail}`);
    to = testEmail;
  }

 // 3) Validation email destinataire
  if (!to || typeof to !== "string" || !to.includes("@")) {
    console.error("[email] Email destinataire invalide:", to);
    return { sent: false, error: "invalid_email" };
  }

 // 3) Envoi via Resend
  try {
    const resend = new Resend(apiKey);

    const payload = {
      from,
      to,
      subject,
    };

    if (html) {
      payload.html = html;
    } else if (text) {
      payload.text = text;
    } else {
      console.error("[email] Corps email vide");
      return { sent: false, error: "empty_body" };
    }

    const result = await resend.emails.send(payload);

    if (result.error) {
      console.error("[email] Erreur Resend:", result.error);
      return { sent: false, error: result.error.message || "resend_error" };
    }

    console.log("[email] ✅ Envoyé:", { to, subject, id: result.data?.id });
    return { sent: true, id: result.data?.id };
  } catch (err) {
    console.error("[email] Exception:", err);
    return { sent: false, error: err.message || "exception" };
  }
}

/**
 * Helpers HTML pour emails transactionnels.
 */
/**
 * Envoie un email stock bas UNIQUEMENT au franchissement du seuil (old > threshold ET new <= threshold).
 * Anti-spam : pas de re-envoi si le stock est deja sous le seuil.
 */
export async function sendLowStockAlert({ product, vendor, oldStock, newStock }) {
  const threshold = Number(product.low_stock_threshold ?? 5);
  if (oldStock <= threshold) return { sent: false, reason: "already_below" };
  if (newStock > threshold) return { sent: false, reason: "above_threshold" };
  if (!vendor?.email) return { sent: false, reason: "no_vendor_email" };
  const tpl = emailTemplates.lowStock({
    vendorName: vendor.name || vendor.email,
    shopName: vendor.shopName || "votre boutique",
    productName: product.name,
    currentStock: newStock,
    threshold,
  });
  return sendMail({ to: vendor.email, ...tpl });
}

/**
 * Envoie un email de notification nouvelle commande au vendeur.
 * @param {object} params
 * @param {string} params.vendorEmail - Email du vendeur
 * @param {string} params.vendorName - Nom du vendeur
 * @param {string} params.shopName - Nom de la boutique
 * @param {number} params.orderId - ID de la commande
 * @param {Array} params.items - Liste des produits [{name, quantity, price, lineTotal}]
 * @param {number} params.subtotal - Sous-total pour ce vendeur
 * @param {string} params.deliveryMethod - "delivery" ou "pickup"
 * @param {string} params.deliveryAddress - Adresse de livraison (si delivery)
 */
export async function sendNewOrderToVendor({ vendorEmail, vendorName, shopName, orderId, items, subtotal, deliveryMethod, deliveryAddress }) {
  if (!vendorEmail) return { sent: false, reason: "no_vendor_email" };
  const tpl = emailTemplates.newOrderToVendor({
    vendorName: vendorName || vendorEmail,
    shopName: shopName || "votre boutique",
    orderId,
    items,
    subtotal,
    deliveryMethod,
    deliveryAddress,
  });
  return sendMail({ to: vendorEmail, ...tpl });
}

export const emailTemplates = {
  /**
   * Email de bienvenue vendeur (validation boutique)
   */
  shopApproved({ shopName, ownerName }) {
    return {
      subject: `🎉 Votre boutique "${shopName}" est approuvée sur Kimoxa`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1a1a1a;">Bonjour ${ownerName || ""},</h1>
          <p>Bonne nouvelle ! Votre boutique <strong>${shopName}</strong> a été <span style="color: #2e7d32; font-weight: bold;">approuvée</span> par l'équipe Kimoxa.</p>
          <p>Vous pouvez maintenant :</p>
          <ul>
            <li>Ajouter vos produits</li>
            <li>Recevoir des commandes</li>
            <li>Gérer votre stock</li>
          </ul>
          <p style="margin-top: 30px;">
            <a href="${BASE_URL}/vendor/dashboard" 
               style="background: #d4af37; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Accéder à mon dashboard
            </a>
          </p>
          <p style="margin-top: 30px; color: #666; font-size: 13px;">
            L'équipe Kimoxa<br/>
            <a href="${BASE_URL}" style="color: #d4af37;">kimoxa.com</a>
          </p>
        </div>
      `,
    };
  },

  /**
   * Email de rejet boutique
   */
  shopRejected({ shopName, ownerName, reason }) {
    return {
      subject: `❌ Votre boutique "${shopName}" nécessite des modifications`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1a1a1a;">Bonjour ${ownerName || ""},</h1>
          <p>Votre boutique <strong>${shopName}</strong> n'a pas pu être validée pour le moment.</p>
          <p><strong>Raison :</strong></p>
          <div style="background: #fff3cd; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107;">
            ${reason || "Informations insuffisantes"}
          </div>
          <p style="margin-top: 20px;">Vous pouvez corriger ces éléments et soumettre à nouveau votre boutique.</p>
          <p style="margin-top: 30px; color: #666; font-size: 13px;">
            L'équipe Kimoxa
          </p>
        </div>
      `,
    };
  },

  /**
   * Email de confirmation de commande acheteur
   */
  orderConfirmation({ orderId, total, deliveryAddress }) {
    return {
      subject: `✅ Commande #${orderId} confirmée — Kimoxa`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1>Merci pour votre commande !</h1>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Commande :</strong> #${orderId}</p>
            <p><strong>Total :</strong> ${total} FCFA</p>
            <p><strong>Livraison :</strong> ${deliveryAddress}</p>
          </div>
          <p>Nous vous tiendrons informé à chaque étape.</p>
          <p style="margin-top: 30px;">
            <a href="${BASE_URL}/orders" 
               style="background: #d4af37; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              Suivre ma commande
            </a>
          </p>
        </div>
      `,
    };
  },

  /**
   * Email de paiement réussi
   */
  paymentSuccess({ orderId, amount }) {
    return {
      subject: `💰 Paiement reçu — Commande #${orderId}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2e7d32;">✅ Paiement confirmé</h1>
          <p>Votre paiement Mobile Money de <strong>${amount} FCFA</strong> a bien été reçu.</p>
          <p>Votre commande #${orderId} passe en préparation.</p>
          <p style="margin-top: 30px;">
            <a href="${BASE_URL}/orders" 
               style="background: #d4af37; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              Voir mes commandes
            </a>
          </p>
        </div>
      `,
    };
  },

  /**
   * Alerte stock bas vendeur (franchissement seuil)
   */
  lowStock({ vendorName, shopName, productName, currentStock, threshold }) {
    return {
      subject: `\u26a0\ufe0f Stock faible \u2014 ${productName} (${shopName})`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #241712, #0F172A); color: #fff; padding: 24px; border-radius: 8px 8px 0 0;">
            <h1 style="margin:0; font-size: 20px;">\u26a0\ufe0f Alerte stock faible</h1>
          </div>
          <div style="background: #fff; padding: 24px; border: 1px solid #eadfce;">
            <p>Bonjour ${vendorName},</p>
            <p>Le stock du produit <strong>${productName}</strong> est passe sous le seuil d'alerte.</p>
            <div style="background: #fff7ed; border-left: 4px solid #e8590c; padding: 16px; margin: 20px 0; border-radius: 4px;">
              <p style="margin:0;"><strong>Stock actuel :</strong> ${currentStock} unit\u00e9(s)</p>
              <p style="margin:8px 0 0 0;"><strong>Seuil d'alerte :</strong> ${threshold} unit\u00e9(s)</p>
            </div>
            <p>Pensez a reapprovisionner pour eviter une rupture et des ventes perdues.</p>
            <p style="margin-top: 30px;">
              <a href="${BASE_URL}/vendor/dashboard"
                 style="background: #d4af37; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Gerer mon stock
              </a>
            </p>
          </div>
          <p style="margin-top: 20px; color: #666; font-size: 13px; text-align: center;">
            Kimoxa \u2014 La marketplace des commercants du Burkina Faso
          </p>
        </div>
      `,
    };
  },


  /**
   * Email de notification nouvelle commande au vendeur
   */
  newOrderToVendor({ vendorName, shopName, orderId, items, subtotal, deliveryMethod, deliveryAddress }) {
    const itemsHtml = items.map(i => `
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee;">${i.name}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; text-align: center;">${i.quantity}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; text-align: right;">${i.price.toLocaleString('fr-FR')} FCFA</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: 600;">${i.lineTotal.toLocaleString('fr-FR')} FCFA</td>
      </tr>
    `).join('');

    return {
      subject: `🛒 Nouvelle commande #${orderId} — ${shopName}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #d4af37; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin:0; font-size: 20px; color: #000;">🛒 Nouvelle commande reçue</h1>
          </div>
          <div style="background: #fff; padding: 24px; border: 1px solid #eadfce;">
            <p>Bonjour ${vendorName},</p>
            <p>Vous avez reçu une nouvelle commande pour votre boutique <strong>${shopName}</strong>.</p>
            
            <div style="background: #f9f9f9; padding: 16px; border-radius: 6px; margin: 20px 0;">
              <p style="margin:0;"><strong>Commande :</strong> #${orderId}</p>
              <p style="margin:8px 0 0 0;"><strong>Livraison :</strong> ${deliveryMethod === 'delivery' ? 'À domicile' : 'Retrait en boutique'}</p>
              ${deliveryAddress ? `<p style="margin:8px 0 0 0;"><strong>Adresse :</strong> ${deliveryAddress}</p>` : ''}
            </div>

            <h3 style="margin-top: 24px;">Produits commandés</h3>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <thead>
                <tr style="background: #f5f5f5;">
                  <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #ddd;">Produit</th>
                  <th style="padding: 12px 8px; text-align: center; border-bottom: 2px solid #ddd;">Qté</th>
                  <th style="padding: 12px 8px; text-align: right; border-bottom: 2px solid #ddd;">Prix</th>
                  <th style="padding: 12px 8px; text-align: right; border-bottom: 2px solid #ddd;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" style="padding: 16px 8px; text-align: right; font-weight: bold; font-size: 16px;">Sous-total :</td>
                  <td style="padding: 16px 8px; text-align: right; font-weight: bold; font-size: 16px; color: #d4af37;">${subtotal.toLocaleString('fr-FR')} FCFA</td>
                </tr>
              </tfoot>
            </table>

            <p style="margin-top: 30px;">
              <a href="${BASE_URL}/vendor/orders"
                 style="background: #d4af37; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Voir la commande
              </a>
            </p>
          </div>
          <p style="margin-top: 20px; color: #666; font-size: 13px; text-align: center;">
            Kimoxa — La marketplace des commerçants du Burkina Faso
          </p>
        </div>
      `,
    };
  },

};
