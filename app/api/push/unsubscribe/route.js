import sql from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Non autorisé" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (body.endpoint) {
    await sql`DELETE FROM push_subscriptions WHERE user_id = ${user.id} AND endpoint = ${body.endpoint}`;
  }
  return Response.json({ ok: true });
}
