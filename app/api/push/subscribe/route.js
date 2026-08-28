import sql from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Non autorisé" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const endpoint = body.endpoint;
  const p256dh = body.keys && body.keys.p256dh;
  const auth = body.keys && body.keys.auth;

  if (!endpoint || !p256dh || !auth) {
    return Response.json({ error: "Subscription invalide." }, { status: 400 });
  }

  await sql`
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
    VALUES (${user.id}, ${endpoint}, ${p256dh}, ${auth})
    ON CONFLICT (endpoint) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      p256dh = EXCLUDED.p256dh,
      auth = EXCLUDED.auth
  `;
  return Response.json({ ok: true });
}
