import sql from "@/lib/db";

async function getConversationAccess(conversationId, userId) {
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

// GET /api/conversations/[id]/messages
// Renvoie les messages d'une conversation et marque comme lus ceux envoyés
// par l'autre partie.
export async function GET(request, { params }) {
  const userId = request.headers.get("x-user-id");
  const { id } = await params;

  const access = await getConversationAccess(id, userId);
  if (!access) {
    return Response.json({ error: "Accès non autorisé." }, { status: 403 });
  }

  const messages = await sql`
    SELECT id, sender_id, sender_role, body, created_at
    FROM messages
    WHERE conversation_id = ${id}
    ORDER BY created_at ASC
  `;

  const otherRole = access.role === "buyer" ? "vendor" : "buyer";
  await sql`
    UPDATE messages SET read_at = NOW()
    WHERE conversation_id = ${id} AND sender_role = ${otherRole} AND read_at IS NULL
  `;

  return Response.json({
    messages,
    myRole: access.role,
    shopName: access.conversation.shop_name,
    orderId: access.conversation.order_id,
  });
}

// POST /api/conversations/[id]/messages
// Envoie un nouveau message dans la conversation.
// body: { body }
export async function POST(request, { params }) {
  const userId = request.headers.get("x-user-id");
  const { id } = await params;

  try {
    const { body } = await request.json();
    if (!body || !body.trim()) {
      return Response.json({ error: "Le message ne peut pas être vide." }, { status: 400 });
    }

    const access = await getConversationAccess(id, userId);
    if (!access) {
      return Response.json({ error: "Accès non autorisé." }, { status: 403 });
    }

    const [message] = await sql`
      INSERT INTO messages (conversation_id, sender_id, sender_role, body)
      VALUES (${id}, ${userId}, ${access.role}, ${body.trim()})
      RETURNING id, sender_id, sender_role, body, created_at
    `;

    await sql`UPDATE conversations SET last_message_at = NOW() WHERE id = ${id}`;

    return Response.json({ message }, { status: 201 });
  } catch (err) {
    console.error("Erreur envoi message:", err);
    return Response.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
