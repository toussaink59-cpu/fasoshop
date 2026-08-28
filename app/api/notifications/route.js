import sql from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Non autorisé" }, { status: 401 });

  const url = new URL(arguments[0].url);
  const limit = Math.min(50, Number(url.searchParams.get("limit") || 20));
  const offset = Number(url.searchParams.get("offset") || 0);

  const rows = await sql`
    SELECT id, type, title, body, link, data, created_at, read_at
    FROM notifications
    WHERE user_id = ${user.id}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  const [unreadRow] = await sql`
    SELECT COUNT(*)::int AS c FROM notifications WHERE user_id = ${user.id} AND read_at IS NULL
  `;

  return Response.json({
    notifications: rows.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      body: r.body,
      link: r.link,
      data: r.data ? JSON.parse(r.data) : null,
      createdAt: r.created_at,
      readAt: r.read_at,
    })),
    unread: unreadRow?.c || 0,
  });
}

export async function PATCH(request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Non autorisé" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { id, all } = body;

  if (all) {
    await sql`UPDATE notifications SET read_at = NOW() WHERE user_id = ${user.id} AND read_at IS NULL`;
  } else if (Number.isInteger(Number(id))) {
    await sql`UPDATE notifications SET read_at = NOW() WHERE id = ${Number(id)} AND user_id = ${user.id}`;
  } else {
    return Response.json({ error: "id ou all requis" }, { status: 400 });
  }
  return Response.json({ ok: true });
}
