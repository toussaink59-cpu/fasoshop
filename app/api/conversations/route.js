import sql from "@/lib/db";

// POST /api/conversations
// Crée (ou retrouve) la conversation liée à une commande + une boutique.
// Accessible à l'acheteur de la commande OU au vendeur de la boutique concernée.
// body: { orderId, shopId }
export async function POST(request) {
  const userId = request.headers.get("x-user-id");
  const userRole = request.headers.get("x-user-role");

  try {
    const { orderId, shopId } = await request.json();
    if (!orderId || !shopId) {
      return Response.json({ error: "orderId et shopId sont requis." }, { status: 400 });
    }

    const [order] = await sql`SELECT id, buyer_id FROM orders WHERE id = ${orderId}`;
    if (!order) {
      return Response.json({ error: "Commande introuvable." }, { status: 404 });
    }

    const [shop] = await sql`SELECT id, vendor_id FROM shops WHERE id = ${shopId}`;
    if (!shop) {
      return Response.json({ error: "Boutique introuvable." }, { status: 404 });
    }

    const isBuyer = String(order.buyer_id) === String(userId);
    const isVendor = String(shop.vendor_id) === String(userId);
    if (!isBuyer && !isVendor) {
      return Response.json({ error: "Accès non autorisé à cette conversation." }, { status: 403 });
    }

    // Vérifie que cette boutique fait bien partie de la commande
    const [item] = await sql`
      SELECT 1 FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ${orderId} AND p.shop_id = ${shopId}
      LIMIT 1
    `;
    if (!item) {
      return Response.json({ error: "Cette boutique n'est pas concernée par cette commande." }, { status: 400 });
    }

    let [conversation] = await sql`
      SELECT id FROM conversations WHERE order_id = ${orderId} AND shop_id = ${shopId}
    `;

    if (!conversation) {
      [conversation] = await sql`
        INSERT INTO conversations (order_id, shop_id, buyer_id)
        VALUES (${orderId}, ${shopId}, ${order.buyer_id})
        RETURNING id
      `;
    }

    return Response.json({ conversationId: conversation.id }, { status: 201 });
  } catch (err) {
    console.error("Erreur creation conversation:", err);
    return Response.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

// GET /api/conversations
// Liste les conversations de l'utilisateur connecté (acheteur ou vendeur),
// avec le dernier message et le nombre de messages non lus.
export async function GET(request) {
  const userId = request.headers.get("x-user-id");
  const userRole = request.headers.get("x-user-role");

  let conversations;

  if (userRole === "vendor") {
    conversations = await sql`
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
  } else {
    conversations = await sql`
      SELECT c.id, c.order_id, c.shop_id, c.last_message_at,
             s.name AS other_party_name, s.name AS shop_name,
             (SELECT body FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
             (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_role = 'vendor' AND read_at IS NULL)::int AS unread_count
      FROM conversations c
      JOIN shops s ON s.id = c.shop_id
      WHERE c.buyer_id = ${userId}
      ORDER BY c.last_message_at DESC
    `;
  }

  return Response.json({ conversations });
}
