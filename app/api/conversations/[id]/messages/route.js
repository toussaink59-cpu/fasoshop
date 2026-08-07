import sql from "@/lib/db";
import { getConversationAccess, getConversationThread } from "@/lib/queries/conversationThread";

// GET /api/conversations/[id]/messages
export async function GET(request, { params }) {
  const userId = request.headers.get("x-user-id");
  const { id } = await params;

  const thread = await getConversationThread(id, userId);
  if (!thread) {
    return Response.json({ error: "Accès non autorisé." }, { status: 403 });
  }

  return Response.json(thread);
}

// POST /api/conversations/[id]/messages
// body: { body, imageUrl? } — texte et/ou photo
export async function POST(request, { params }) {
  const userId = request.headers.get("x-user-id");
  const { id } = await params;

  try {
    const { body, imageUrl } = await request.json();
    const cleanBody = (body || "").trim();

    if (!cleanBody && !imageUrl) {
      return Response.json({ error: "Le message ne peut pas être vide." }, { status: 400 });
    }

    const access = await getConversationAccess(id, userId);
    if (!access) {
      return Response.json({ error: "Accès non autorisé." }, { status: 403 });
    }

    const finalBody = cleanBody || "📷 Photo";

    const [message] = await sql`
      INSERT INTO messages (conversation_id, sender_id, sender_role, body, image_url)
      VALUES (${id}, ${userId}, ${access.role}, ${finalBody}, ${imageUrl || null})
      RETURNING id, sender_id, sender_role, body, image_url, created_at
    `;

    await sql`UPDATE conversations SET last_message_at = NOW() WHERE id = ${id}`;

    return Response.json({ message }, { status: 201 });
  } catch (err) {
    console.error("Erreur envoi message:", err);
    return Response.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
