import sql from "@/lib/db";
import { getAdminConversationThread } from "@/lib/queries/adminConversations";
import { adminGuard } from "@/lib/adminAuth";

// GET /api/admin/conversations/[id] — lit un fil complet (admin seul)
export async function GET(request, { params }) {
  const guardError = await adminGuard(request);
  if (guardError) return guardError;

  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return Response.json({ error: "Connexion requise." }, { status: 401 });
  }
  const [u] = await sql`SELECT role FROM users WHERE id = ${userId}`;
  if (!u || u.role !== "admin") {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { id } = await params;
  const thread = await getAdminConversationThread(id);
  if (!thread) {
    return Response.json({ error: "Conversation introuvable." }, { status: 404 });
  }

  return Response.json(thread);
}
