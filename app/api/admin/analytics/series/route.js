import sql from "@/lib/db";
import { adminGuard } from "@/lib/adminAuth";

// GET /api/admin/analytics/series?mode=range&days=1|7|30
// GET /api/admin/analytics/series?mode=year&year=2026
// Renvoie la série de ventes selon la période demandée, avec la bonne
// granularité (heure pour 1 jour, jour pour 7/30 jours, mois pour une année).
export async function GET(request) {
  const guardError = adminGuard(request);
  if (guardError) return guardError;

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") || "range";
  const days = Number(searchParams.get("days")) || 30;
  const year = Number(searchParams.get("year")) || new Date().getFullYear();

  if (mode === "range" && days === 1) {
    // Vue horaire pour aujourd'hui
    const rows = await sql`
      SELECT EXTRACT(HOUR FROM created_at)::int AS hour, COALESCE(SUM(gross_amount), 0)::float AS gross
      FROM shop_commission_ledger
      WHERE created_at::date = CURRENT_DATE
      GROUP BY hour
    `;
    const map = new Map(rows.map((r) => [r.hour, r.gross]));
    const series = [];
    for (let h = 0; h < 24; h++) {
      series.push({ label: `${String(h).padStart(2, "0")}h`, gross: map.get(h) || 0 });
    }
    return Response.json({ series, granularity: "hour" });
  }

  if (mode === "year") {
    const rows = await sql`
      SELECT EXTRACT(MONTH FROM created_at)::int AS month, COALESCE(SUM(gross_amount), 0)::float AS gross
      FROM shop_commission_ledger
      WHERE EXTRACT(YEAR FROM created_at) = ${year}
      GROUP BY month
    `;
    const map = new Map(rows.map((r) => [r.month, r.gross]));
    const MONTH_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
    const series = [];
    for (let m = 1; m <= 12; m++) {
      series.push({ label: MONTH_LABELS[m - 1], gross: map.get(m) || 0 });
    }
    return Response.json({ series, granularity: "month" });
  }

  // Vue quotidienne pour 7 ou 30 jours
  const rows = await sql`
    SELECT created_at::date AS day, COALESCE(SUM(gross_amount), 0)::float AS gross
    FROM shop_commission_ledger
    WHERE created_at >= CURRENT_DATE - (${days - 1} || ' days')::interval
    GROUP BY day
    ORDER BY day
  `;
  const map = new Map(rows.map((r) => [r.day.toISOString().slice(0, 10), r.gross]));
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
    series.push({ label, gross: map.get(key) || 0 });
  }
  return Response.json({ series, granularity: "day" });
}
