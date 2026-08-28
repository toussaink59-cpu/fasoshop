import sql from "./db.js";

export const NOTIF_TYPES = {
  ORDER_NEW: "order_new",           // vendeur : nouvelle commande
  ORDER_SHIPPED: "order_shipped",   // client : commande expédiée
  ORDER_DELIVERED: "order_delivered", // client : livrée (confirmez réception)
  ORDER_CANCELLED: "order_cancelled", // client/vendeur : annulée
  PAYOUT_RELEASED: "payout_released", // vendeur : argent libéré
  PAYOUT_PAID: "payout_paid",       // vendeur : reversement envoyé
  MESSAGE_NEW: "message_new",       // utilisateur : nouveau message
  SHOP_VERIFIED: "shop_verified",   // vendeur : boutique approuvée
  SHOP_REJECTED: "shop_rejected",   // vendeur : boutique refusée
  MODERATION_UPDATE: "moderation_update",
};

/**
 * Crée une notification pour un utilisateur donné.
 * - userId : obligatoire
 * - title, body : texte affiché dans le centre
 * - type : clé de NOTIF_TYPES
 * - link : URL où emmener l'utilisateur au clic
 * - data : objet JSON libre (ex: order_id) pour futur push web
 * Silencieux en cas d'erreur (ne fait jamais planter la route appelante).
 */
export async function createNotification({ userId, title, body, type, link = null, data = null }) {
  try {
    if (!userId) return;
    await sql`
      INSERT INTO notifications (user_id, type, title, body, link, data, created_at)
      VALUES (${userId}, ${type || "info"}, ${title}, ${body || null}, ${link}, ${data ? JSON.stringify(data) : null}, NOW())
    `;
  } catch (err) {
    console.error("[notif] createNotification error:", err.message);
  }
}

export async function listUnreadCount(userId) {
  const [row] = await sql`
    SELECT COUNT(*)::int AS c FROM notifications WHERE user_id = ${userId} AND read_at IS NULL
  `;
  return row?.c || 0;
}
