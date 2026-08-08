import sql from "@/lib/db";

// Gains du vendeur connecté (séquestrés / libérés / payés)
export async function getVendorEarnings(shopId) {
  const [stats] = await sql`
    SELECT
      COALESCE(SUM(CASE WHEN payout_status = 'held' THEN payout_amount ELSE 0 END), 0) AS held_amount,
      COUNT(CASE WHEN payout_status = 'held' THEN 1 END) AS held_count,
      COALESCE(SUM(CASE WHEN payout_status = 'released' THEN payout_amount ELSE 0 END), 0) AS released_amount,
      COUNT(CASE WHEN payout_status = 'released' THEN 1 END) AS released_count,
      COALESCE(SUM(CASE WHEN payout_status = 'paid' THEN payout_amount ELSE 0 END), 0) AS paid_amount,
      COUNT(CASE WHEN payout_status = 'paid' THEN 1 END) AS paid_count,
      COALESCE(SUM(gross_amount), 0) AS total_gross,
      COALESCE(SUM(commission_amount), 0) AS total_commission
    FROM shop_commission_ledger
    WHERE shop_id = ${shopId}
  `;
  return stats;
}

// Commissions Kimoxa globales (pour l'admin)
export async function getAdminEarnings() {
  const [stats] = await sql`
    SELECT
      COALESCE(SUM(commission_amount), 0) AS total_commission,
      COALESCE(SUM(CASE WHEN payout_status = 'held' THEN payout_amount ELSE 0 END), 0) AS held_amount,
      COUNT(CASE WHEN payout_status = 'held' THEN 1 END) AS held_count,
      COALESCE(SUM(CASE WHEN payout_status = 'released' THEN payout_amount ELSE 0 END), 0) AS released_amount,
      COUNT(CASE WHEN payout_status = 'released' THEN 1 END) AS released_count,
      COALESCE(SUM(CASE WHEN payout_status = 'paid' THEN payout_amount ELSE 0 END), 0) AS paid_amount,
      COALESCE(SUM(gross_amount), 0) AS total_gross
    FROM shop_commission_ledger
  `;
  return stats;
}
