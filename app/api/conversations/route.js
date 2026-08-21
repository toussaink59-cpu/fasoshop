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

// POST /api/conversations — cree (ou reprend) une conversation pre-vente sur un produit
export async function POST(request) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return Response.json({ error: "Non authentifie." }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Corps invalide." }, { status: 400 }); }
  const productId = Number(body?.productId);
  const initialMessage = String(body?.message || "").trim().slice(0, 1000);
  if (!productId) return Response.json({ error: "Produit requis." }, { status: 400 });

  // Resolution serveur : le shop vient du produit, jamais du client
  const [product] = await sql`
    SELECT p.id, p.name, s.id AS shop_id, s.vendor_id
    FROM products p JOIN shops s ON s.id = p.shop_id
    WHERE p.id = ${productId}`;
  if (!product) return Response.json({ error: "Produit introuvable." }, { status: 404 });
  if (String(product.vendor_id) === String(userId))
    return Response.json({ error: "Reprenez une conversation existante avec ce client." }, { status: 400 });

  // Anti-doublon : conversation pre-vente existante ?
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
