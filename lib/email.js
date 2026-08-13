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

  // 🔒 1) Mode développement : pas de clé → log et retour
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY non défini — email non envoyé");
    console.log("[email stub] To:", to);
    console.log("[email stub] Subject:", subject);
    console.log("[email stub] Body:", html || text);
    return { sent: false, reason: "email_not_configured" };
  }

  // 🔒 2) Validation email destinataire
  if (!to || typeof to !== "string" || !to.includes("@")) {
    console.error("[email] Email destinataire invalide:", to);
    return { sent: false, error: "invalid_email" };
  }

  // 🔒 3) Envoi via Resend
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
            <a href="https://fasoshop.vercel.app/vendor/dashboard" 
               style="background: #d4af37; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Accéder à mon dashboard
            </a>
          </p>
          <p style="margin-top: 30px; color: #666; font-size: 13px;">
            L'équipe Kimoxa<br/>
            <a href="https://fasoshop.vercel.app" style="color: #d4af37;">fasoshop.vercel.app</a>
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
            <a href="https://fasoshop.vercel.app/orders" 
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
            <a href="https://fasoshop.vercel.app/orders" 
               style="background: #d4af37; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              Voir mes commandes
            </a>
          </p>
        </div>
      `,
    };
  },
};