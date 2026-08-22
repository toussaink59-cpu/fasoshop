import sql from "@/lib/db";
import { isValidCronAuth } from "@/lib/cronAuth";

// CRON hebdomadaire : supprime les tokens de reset de mot de passe
// expirés ou déjà utilisés depuis plus de 30 jours. Sans ce nettoyage,
// password_reset_tokens grossit indéfiniment (voir audit du 20/08/2026,
// section "Données & migrations").
export async function POST(request) {
  // Fail-closed + comparaison timing-safe (voir lib/cronAuth.js)
  if (!isValidCronAuth(request)) {
    if (!process.env.CRON_SECRET) console.error("[cron] CRON_SECRET non defini - refus");
    return Response.json({ error: "Non autorise." }, { status: 401 });
  }

  try {
    const deleted = await sql`
      DELETE FROM password_reset_tokens
      WHERE expires_at < now() - interval '30 days'
         OR (used_at IS NOT NULL AND used_at < now() - interval '30 days')
      RETURNING id
    `;
    return Response.json({ ok: true, deleted: deleted.length });
  } catch (err) {
    console.error("[cron/cleanup-reset-tokens]", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
