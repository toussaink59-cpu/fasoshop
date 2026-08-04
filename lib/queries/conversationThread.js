import sql from "@/lib/db";

export async function getConversationAccess(conversationId, userId) {
  const [conversation] = await sql`
    SELECT c.id, c.order_id, c.buyer_id, s.vendor_id, s.name AS shop_name
    FROM conversations c
    JOIN shops s ON s.id = c.shop_id
    WHERE c.id = ${conversationId}
  `;
  if (!conversation) return null;

  const isBuyer = String(conversation.buyer_id) === String(userId);
  const isVendor = String(conversation.vendor_id) === String(userId);
  if (!isBuyer && !isVendor) return null;

  return { conversation, role: isBuyer ? "buyer" : "vendor" };
}

/**
 * Charge le fil de messages d'une conversation et marque comme lus ceux
 * envoyés par l'autre partie (même effet de bord que l'ancien GET client).
 * Retourne null si la conversation n'existe pas ou n'appartient pas à cet
 * utilisateur — à l'appelant de décider (403 API, redirect page).
 */
export async function getConversationThread(conversationId, userId) {
  const access = await getConversationAccess(conversationId, userId);
  if (!access) return null;

  const messages = await sql`
    SELECT id, sender_id, sender_role, body, created_at
    FROM messages
    WHERE conversation_id = ${conversationId}
    ORDER BY created_at ASC
  `;

  const otherRole = access.role === "buyer" ? "vendor" : "buyer";
  await sql`
    UPDATE messages SET read_at = NOW()
    WHERE conversation_id = ${conversationId} AND sender_role = ${otherRole} AND read_at IS NULL
  `;

  return {
    messages,
    myRole: access.role,
    shopName: access.conversation.shop_name,
    orderId: access.conversation.order_id,
  };
}
