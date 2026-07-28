// Stub d'envoi d'email. Tant que Resend n'est pas configuré (domaine pro
// requis), on se contente de logguer le message côté serveur — rien ne
// bloque le flux applicatif. Le jour où Resend est prêt, remplacer le corps
// de sendMail par un vrai appel à l'API Resend, en gardant la même signature.
//
// Usage : import { sendMail } from "@/lib/email";
//         await sendMail({ to, subject, text });

export async function sendMail({ to, subject, text }) {
  console.log("[email stub] Destinataire:", to);
  console.log("[email stub] Sujet:", subject);
  console.log("[email stub] Message:", text);
  // Pas d'envoi réel pour l'instant — ne jette jamais d'erreur, pour ne pas
  // bloquer les actions admin (validation/rejet boutique, etc.)
  return { sent: false, reason: "email_not_configured" };
}
