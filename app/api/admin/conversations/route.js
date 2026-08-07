import sql from "@/lib/db";
import { getAdminConversations } from "@/lib/queries/adminConversations";

// GET /api/admin/conversations — liste toutes les conversations (admin seul)
export async function GET(request) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return Response.json({ error: "Connexion requise." }, { status: 401 });
  }
  const [u] = await sql`SELECT role FROM users WHERE id = ${userId}`;
  if (!u || u.role !== "admin") {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }

  const conversations = await getAdminConversations();
  return Response.json({ conversations });
}
