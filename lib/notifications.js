import sql from "./db.js";
import webpush from "web-push";

export const NOTIF_TYPES = {
  ORDER_NEW: "order_new",
  ORDER_SHIPPED: "order_shipped",
  ORDER_DELIVERED: "order_delivered",
  ORDER_CANCELLED: "order_cancelled",
  PAYOUT_RELEASED: "payout_released",
  PAYOUT_PAID: "payout_paid",
  MESSAGE_NEW: "message_new",
  SHOP_VERIFIED: "shop_verified",
  SHOP_REJECTED: "shop_rejected",
  MODERATION_UPDATE: "moderation_update",
};

const VAPID_SUBJECT = "mailto:contact@kimoxa.com";

async function getVapidKeys() {
  try {
    let [row] = await sql`SELECT public_key, private_key FROM push_vapid WHERE id = 1`;
    if (!row) {
      const gen = webpush.generateVAPIDKeys();
      await sql`
        INSERT INTO push_vapid (id, public_key, private_key)
        VALUES (1, ${gen.publicKey}, ${gen.privateKey})
        ON CONFLICT (id) DO NOTHING
      `;
      [row] = await sql`SELECT public_key, private_key FROM push_vapid WHERE id = 1`;
    }
    return row || null;
  } catch (e) {
    return null;
  }
}

/**
 * Envoie une notification push web à tous les appareils abonnés de l'utilisateur.
 * - Supprime automatiquement les abonnements morts (404/410).
 * - Jamais bloquant : toutes les erreurs sont avalées.
 */
export async function sendPushToUser(userId, payload) {
  try {
    const keys = await getVapidKeys();
    if (!keys) return;
    webpush.setVapidDetails(VAPID_SUBJECT, keys.public_key, keys.private_key);

    const subs = await sql`SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ${userId}`;
    for (const s of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { TTL: 86400 }
        );
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await sql`DELETE FROM push_subscriptions WHERE endpoint = ${s.endpoint}`.catch(() => {});
        }
      }
    }
  } catch (e) {
    console.error("[push] send error:", e.message);
  }
}

/**
 * Crée une notification in-app (cloche) + push web (appareil), sans jamais
 * faire planter la route appelante.
 */
export async function createNotification({ userId, title, body, type, link = null, data = null }) {
  try {
    if (!userId) return;
    await sql`
      INSERT INTO notifications (user_id, type, title, body, link, data, created_at)
      VALUES (${userId}, ${type || "info"}, ${title}, ${body || null}, ${link}, ${data ? JSON.stringify(data) : null}, NOW())
    `;
    sendPushToUser(userId, { title, body, type, link }).catch(() => {});
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
