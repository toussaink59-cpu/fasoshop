import sql from "@/lib/db";

// Liste les conversations de l'utilisateur (acheteur ou vendeur), avec le
// dernier message et le nombre de messages non lus.
export async function getUserConversations(userId, userRole) {
  try {

  if (userRole === "vendor") {
    return sql`
      SELECT c.id, c.order_id, c.shop_id, c.last_message_at,
             u.full_name AS other_party_name, s.name AS shop_name,
             (SELECT body FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
             (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_role = 'buyer' AND read_at IS NULL)::int AS unread_count
      FROM conversations c
      JOIN shops s ON s.id = c.shop_id
      JOIN users u ON u.id = c.buyer_id
      WHERE s.vendor_id = ${userId}
      ORDER BY c.last_message_at DESC
    `;
  }

  return sql`
    SELECT c.id, c.order_id, c.shop_id, c.last_message_at,
           s.name AS other_party_name, s.name AS shop_name,
           (SELECT body FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
           (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_role = 'vendor' AND read_at IS NULL)::int AS unread_count
    FROM conversations c
    JOIN shops s ON s.id = c.shop_id
    WHERE c.buyer_id = ${userId}
    ORDER BY c.last_message_at DESC
  `;
  } catch (err) {
    console.error('[conversations.js:getUserConversations] DB error:', err.message);
    return [];
  }
}
