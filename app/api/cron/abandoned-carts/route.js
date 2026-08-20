import sql from "@/lib/db";
import { sendAbandonedCartEmail } from "@/lib/email/abandoned-cart";

export async function GET(request) {
  const auth = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    console.warn("[cron/abandoned-carts] Unauthorized attempt");
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const candidates = await sql`
      SELECT ac.user_id, ac.email, ac.items, ac.total_cents, u.full_name
      FROM abandoned_carts ac
      JOIN users u ON u.id = ac.user_id
      WHERE ac.reminded_at IS NULL AND ac.converted_at IS NULL
        AND ac.last_seen < now() - interval '24 hours'
        AND jsonb_array_length(ac.items) > 0
        AND ac.total_cents > 0
      LIMIT 50
    `;
    let sent = 0, failed = 0;
    for (const c of candidates) {
      const items = Array.isArray(c.items) ? c.items : [];
      if (items.length === 0) continue;
      const result = await sendAbandonedCartEmail(c.email, c.full_name, items, Number(c.total_cents));
      if (result.ok) {
        await sql`UPDATE abandoned_carts SET reminded_at = now() WHERE user_id = ${c.user_id}`;
        sent++;
      } else {
        failed++;
      }
    }
    return Response.json({ ok: true, candidates: candidates.length, sent, failed });
  } catch (err) {
    console.error("[cron/abandoned-carts]", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
