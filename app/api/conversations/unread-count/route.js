import sql from "@/lib/db";

// GET /api/conversations/unread-count
// Renvoie le nombre total de messages non lus adressés à l'utilisateur
// connecté, tous rôles confondus (acheteur ou vendeur).
export async function GET(request) {
  const userId = request.headers.get("x-user-id");
  const userRole = request.headers.get("x-user-role");

  let result;
  if (userRole === "vendor") {
    [result] = await sql`
      SELECT COUNT(*)::int AS unread
      FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      JOIN shops s ON s.id = c.shop_id
      WHERE s.vendor_id = ${userId} AND m.sender_role = 'buyer' AND m.read_at IS NULL
    `;
  } else {
    [result] = await sql`
      SELECT COUNT(*)::int AS unread
      FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE c.buyer_id = ${userId} AND m.sender_role = 'vendor' AND m.read_at IS NULL
    `;
  }

  return Response.json({ unread: result.unread });
}
