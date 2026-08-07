import sql from "@/lib/db";

// Liste TOUTES les conversations (vue admin uniquement)
export async function getAdminConversations() {
  return sql`
    SELECT c.id, c.order_id, c.created_at, c.last_message_at,
           b.full_name AS buyer_name,
           s.name AS shop_name,
           v.full_name AS vendor_name,
           (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS message_count,
           (SELECT body FROM messages m WHERE m.conversation_id = c.id
            ORDER BY m.created_at DESC LIMIT 1) AS last_message
    FROM conversations c
    JOIN shops s ON s.id = c.shop_id
    JOIN users b ON b.id = c.buyer_id
    JOIN users v ON v.id = s.vendor_id
    ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
  `;
}

// Fil complet d'une conversation (vue admin)
export async function getAdminConversationThread(conversationId) {
  const [conversation] = await sql`
    SELECT c.id, c.order_id,
           b.full_name AS buyer_name,
           s.name AS shop_name,
           v.full_name AS vendor_name
    FROM conversations c
    JOIN shops s ON s.id = c.shop_id
    JOIN users b ON b.id = c.buyer_id
    JOIN users v ON v.id = s.vendor_id
    WHERE c.id = ${conversationId}
  `;
  if (!conversation) return null;

  const messages = await sql`
    SELECT m.id, m.sender_role, m.body, m.image_url, m.created_at,
           u.full_name AS sender_name
    FROM messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.conversation_id = ${conversationId}
    ORDER BY m.created_at ASC
  `;

  return { conversation, messages };
}
