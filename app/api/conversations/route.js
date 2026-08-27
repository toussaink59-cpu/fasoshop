import sql from "@/lib/db";

// GET /api/conversations?role=vendor|buyer — liste de l'utilisateur connecte
export async function GET(request) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return Response.json({ error: "Non authentifie." }, { status: 401 });

  const asVendor = new URL(request.url).searchParams.get("role") === "vendor";

  const rows = asVendor
    ? await sql`
        SELECT c.id, c.last_message_at, c.order_id, c.product_id,
               s.name AS shop_name, u.full_name AS partner_name,
               p.name AS product_name, p.images AS product_images,
               (SELECT COUNT(*)::int FROM messages m
                 WHERE m.conversation_id = c.id AND m.read_at IS NULL
                   AND m.sender_id <> ${userId}) AS unread_count,
               (SELECT m2.body FROM messages m2 WHERE m2.conversation_id = c.id
                 ORDER BY m2.created_at DESC LIMIT 1) AS last_message
        FROM conversations c
        JOIN shops s ON s.id = c.shop_id
        JOIN users u ON u.id = c.buyer_id
        LEFT JOIN products p ON p.id = c.product_id
        WHERE s.vendor_id = ${userId}
        ORDER BY c.last_message_at DESC LIMIT 100`
    : await sql`
        SELECT c.id, c.last_message_at, c.order_id, c.product_id,
               s.name AS shop_name,
               p.name AS product_name, p.images AS product_images,
               (SELECT COUNT(*)::int FROM messages m
                 WHERE m.conversation_id = c.id AND m.read_at IS NULL
                   AND m.sender_id <> ${userId}) AS unread_count,
               (SELECT m2.body FROM messages m2 WHERE m2.conversation_id = c.id
                 ORDER BY m2.created_at DESC LIMIT 1) AS last_message
        FROM conversations c
        JOIN shops s ON s.id = c.shop_id
        LEFT JOIN products p ON p.id = c.product_id
        WHERE c.buyer_id = ${userId}
        ORDER BY c.last_message_at DESC LIMIT 100`;

  return Response.json({ conversations: rows });
}

// POST /api/conversations — crée (ou reprend) une conversation
// 2 modes supportés :
//   A) Pré-vente   : body = { productId, message? }
//   B) Post-vente  : body = { orderId, shopId } → conversation liée à une commande
export async function POST(request) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return Response.json({ error: "Non authentifie." }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Corps invalide." }, { status: 400 }); }

  const productId = body?.productId ? Number(body.productId) : null;
  const orderId = body?.orderId ? Number(body.orderId) : null;
  const shopId = body?.shopId ? Number(body.shopId) : null;
  const initialMessage = String(body?.message || "").trim().slice(0, 1000);

  // ============ MODE B : Post-vente (depuis une commande) ============
  if (orderId && shopId) {
    const [order] = await sql`SELECT id, buyer_id FROM orders WHERE id = ${orderId}`;
    if (!order) return Response.json({ error: "Commande introuvable." }, { status: 404 });
    if (String(order.buyer_id) !== String(userId)) {
      return Response.json({ error: "Accès refusé." }, { status: 403 });
    }

    const [shopCheck] = await sql`
      SELECT 1 FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ${orderId} AND p.shop_id = ${shopId}
      LIMIT 1`;
    if (!shopCheck) {
      return Response.json({ error: "Ce vendeur n'appartient pas à cette commande." }, { status: 400 });
    }

    const [firstItem] = await sql`
      SELECT oi.product_id FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ${orderId} AND p.shop_id = ${shopId}
      LIMIT 1`;
    const refProductId = firstItem ? firstItem.product_id : null;

    const [existing] = await sql`
      SELECT id FROM conversations
      WHERE buyer_id = ${userId} AND shop_id = ${shopId} AND order_id = ${orderId}`;
    const conv = existing || (await sql`
      INSERT INTO conversations (order_id, shop_id, buyer_id, product_id)
      VALUES (${orderId}, ${shopId}, ${userId}, ${refProductId})
      RETURNING id`)[0];

    if (initialMessage) {
      await sql`INSERT INTO messages (conversation_id, sender_id, sender_role, body)
                VALUES (${conv.id}, ${userId}, 'buyer', ${initialMessage})`;
      await sql`UPDATE conversations SET last_message_at = now() WHERE id = ${conv.id}`;
    }

    return Response.json({ conversationId: conv.id });
  }

  // ============ MODE A : Pré-vente (depuis une fiche produit) ============
  if (!productId) {
    return Response.json({ error: "Produit ou commande requis." }, { status: 400 });
  }

  const [product] = await sql`
    SELECT p.id, p.name, s.id AS shop_id, s.vendor_id
    FROM products p JOIN shops s ON s.id = p.shop_id
    WHERE p.id = ${productId}`;
  if (!product) return Response.json({ error: "Produit introuvable." }, { status: 404 });
  if (String(product.vendor_id) === String(userId))
    return Response.json({ error: "Reprenez une conversation existante avec ce client." }, { status: 400 });

  const [existing] = await sql`
    SELECT id FROM conversations
    WHERE buyer_id = ${userId} AND shop_id = ${product.shop_id} AND product_id = ${product.id} AND order_id IS NULL`;
  const conv = existing || (await sql`
    INSERT INTO conversations (order_id, shop_id, buyer_id, product_id)
    VALUES (NULL, ${product.shop_id}, ${userId}, ${product.id})
    RETURNING id`)[0];

  if (initialMessage) {
    await sql`INSERT INTO messages (conversation_id, sender_id, sender_role, body)
              VALUES (${conv.id}, ${userId}, 'buyer', ${initialMessage})`;
    await sql`UPDATE conversations SET last_message_at = now() WHERE id = ${conv.id}`;
  }

  return Response.json({ conversationId: conv.id });
}
