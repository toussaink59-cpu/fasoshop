import sql from "@/lib/db";
import { rateLimit, clientKey } from "@/lib/rate-limit";

// GET /api/conversations/:id?after=123 ? messages de la conversation
export async function GET(request, { params }) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return Response.json({ error: "Non authentifie." }, { status: 401 });

  const { id } = await params;
  const convId = Number(id);
  if (!convId) return Response.json({ error: "ID invalide." }, { status: 400 });

  const [conv] = await sql`
    SELECT c.buyer_id, s.vendor_id
    FROM conversations c JOIN shops s ON s.id = c.shop_id
    WHERE c.id = ${convId}`;
  if (!conv) return Response.json({ error: "Conversation introuvable." }, { status: 404 });
  if (String(conv.buyer_id) !== String(userId) && String(conv.vendor_id) !== String(userId))
    return Response.json({ error: "Acces refuse." }, { status: 403 });

  const after = Number(new URL(request.url).searchParams.get("after")) || 0;
  const messages = await sql`
    SELECT id, sender_id, sender_role, body, created_at, read_at
    FROM messages
    WHERE conversation_id = ${convId} AND id > ${after}
    ORDER BY created_at ASC
    LIMIT 100`;

  return Response.json({ messages });
}

// POST /api/conversations/:id ? envoyer un message
export async function POST(request, { params }) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return Response.json({ error: "Non authentifie." }, { status: 401 });

  if (!(await rateLimit(`chat:send:${clientKey(request)}`, { limit: 10, windowMs: 60_000 })))
    return Response.json({ error: "Trop de messages. Attendez une minute." }, { status: 429 });

  const { id } = await params;
  const convId = Number(id);
  if (!convId) return Response.json({ error: "ID invalide." }, { status: 400 });

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Corps invalide." }, { status: 400 }); }
  const text = String(body?.message || "").trim().slice(0, 1000);
  if (!text) return Response.json({ error: "Message vide." }, { status: 400 });

  const [conv] = await sql`
    SELECT c.buyer_id, s.vendor_id
    FROM conversations c JOIN shops s ON s.id = c.shop_id
    WHERE c.id = ${convId}`;
  if (!conv) return Response.json({ error: "Conversation introuvable." }, { status: 404 });

  let senderRole;
  if (String(conv.buyer_id) === String(userId)) {
    senderRole = "buyer";
  } else if (String(conv.vendor_id) === String(userId)) {
    senderRole = "vendor";
  } else {
    return Response.json({ error: "Acces refuse." }, { status: 403 });
  }

  const [msg] = await sql`
    INSERT INTO messages (conversation_id, sender_id, sender_role, body)
    VALUES (${convId}, ${userId}, ${senderRole}, ${text})
    RETURNING id, sender_id, sender_role, body, created_at`;

  await sql`UPDATE conversations SET last_message_at = now() WHERE id = ${convId}`;

  return Response.json({ message: msg });
}

// PATCH /api/conversations/:id ? marquer tous les messages non lus comme lus
export async function PATCH(request, { params }) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return Response.json({ error: "Non authentifie." }, { status: 401 });

  const { id } = await params;
  const convId = Number(id);
  if (!convId) return Response.json({ error: "ID invalide." }, { status: 400 });

  const [conv] = await sql`
    SELECT c.buyer_id, s.vendor_id
    FROM conversations c JOIN shops s ON s.id = c.shop_id
    WHERE c.id = ${convId}`;
  if (!conv) return Response.json({ error: "Conversation introuvable." }, { status: 404 });
  if (String(conv.buyer_id) !== String(userId) && String(conv.vendor_id) !== String(userId))
    return Response.json({ error: "Acces refuse." }, { status: 403 });

  await sql`
    UPDATE messages
    SET read_at = now()
    WHERE conversation_id = ${convId}
      AND sender_id <> ${userId}
      AND read_at IS NULL`;

  return Response.json({ success: true });
}
