import sql from "@/lib/db";
import { isValidCronAuth } from "@/lib/cronAuth";

// Route ONE-SHOT protegee par CRON_SECRET (meme mecanisme que les crons)
// Usage : curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3001/api/admin/migrations/apply-p0-02
export async function POST(request) {
  if (!isValidCronAuth(request)) {
    if (!process.env.CRON_SECRET) console.error("[migration P0-02] CRON_SECRET non defini - refus");
    return Response.json({ error: "Non autorise." }, { status: 401 });
  }

  try {
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_payout_requests_one_pending_per_shop
        ON payout_requests (shop_id)
        WHERE status = 'pending'
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_payout_requests_shop_status
        ON payout_requests (shop_id, status, created_at DESC)
    `;

    return Response.json({
      ok: true,
      migration: "001_payout_requests_unique_pending",
      applied: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[migration P0-02]", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
