import sql from "@/lib/db";
import { isValidCronAuth } from "@/lib/cronAuth";
import {
  payoutMode,
  validatePayout,
  prepareAttempt,
  sendPayout,
  checkPayoutStatus,
} from "@/lib/payouts";

// Plafonds anti-catastrophe
const MAX_PER_VENDOR_DAY = 500_000; // 500k FCFA max par vendeur/jour
const MAX_TOTAL_DAY = 5_000_000;    // 5M FCFA max global/jour

async function finalizeLedgerPaid(ledgerId, { amount, method, reference }) {
  return sql.begin(async (tx) => {
    const [ledger] = await tx`
      SELECT id, payout_status, shop_id FROM shop_commission_ledger
      WHERE id = ${ledgerId} FOR UPDATE
    `;
    if (!ledger || ledger.payout_status !== "released") return false;

    await tx`
      UPDATE shop_commission_ledger
      SET payout_status = 'paid', payout_paid_at = NOW()
      WHERE id = ${ledgerId}
    `;

    await tx`
      UPDATE payout_requests
      SET status = 'paid',
          processed_at = NOW(),
          admin_notes = COALESCE(admin_notes, "") || " · Auto-payout #" || ${ledgerId}
      WHERE shop_id = ${ledger.shop_id}
        AND status IN ('pending', 'approved')
    `;

    await tx`
      INSERT INTO security_audit_log (action, resource_type, resource_id, ip_address)
      VALUES ('auto_payout_paid', 'payout', ${ledgerId}, "cron")
    `.catch(() => {});

    return true;
  });
}

export async function POST(request) {
  if (!isValidCronAuth(request)) {
    if (!process.env.CRON_SECRET) console.error("[cron/auto-payout] CRON_SECRET non défini - refus");
    return Response.json({ error: "Non autorisé." }, { status: 401 });
  }

  if (payoutMode() !== "auto") {
    return Response.json({ ok: true, skipped: true, reason: "PAYOUT_MODE != auto" });
  }

  const stats = { processed: 0, succeeded: 0, failed: 0, skipped: 0, unconfirmed: 0, errors: [] };

  try {
    // Plafond global quotidien
    const [globalDaySum] = await sql`
      SELECT COALESCE(SUM(payout_amount), 0)::int AS sum
      FROM shop_commission_ledger
      WHERE payout_status = 'paid'
        AND payout_paid_at >= CURRENT_DATE
    `;
    if ((globalDaySum?.sum || 0) >= MAX_TOTAL_DAY) {
      return Response.json({ ok: true, stats, halted: "total_day_limit_reached" });
    }

    const ledgerRows = await sql`
      SELECT scl.id, scl.payout_amount, scl.shop_id,
             s.mobile_money_number, s.mobile_money_operator, s.mobile_money_provider
      FROM shop_commission_ledger scl
      JOIN shops s ON s.id = scl.shop_id
      WHERE scl.payout_status = 'released'
        AND s.status = "active"
        AND s.mobile_money_number IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM payout_requests pr
          WHERE pr.shop_id = scl.shop_id
            AND pr.status IN ("pending", "approved")
        )
      ORDER BY scl.payout_released_at ASC
      LIMIT 50
    `;

    for (const row of ledgerRows) {
      stats.processed++;
      try {
        const provider = row.mobile_money_operator
          || (row.mobile_money_provider === "moov" ? "moov_money" : "orange_money");

        // Plafond quotidien vendeur
        const [vendorDaySum] = await sql`
          SELECT COALESCE(SUM(scl2.payout_amount), 0)::int AS sum
          FROM shop_commission_ledger scl2
          WHERE scl2.shop_id = ${row.shop_id}
            AND scl2.payout_status = "paid"
            AND scl2.payout_paid_at >= CURRENT_DATE
        `;
        if ((vendorDaySum?.sum || 0) + Number(row.payout_amount) > MAX_PER_VENDOR_DAY) {
          stats.skipped++;
          stats.errors.push({ ledger: row.id, reason: "vendor_day_limit" });
          continue;
        }

        const v = validatePayout({
          amount: Number(row.payout_amount),
          phone: row.mobile_money_number,
          provider,
        });
        if (!v.ok) {
          stats.failed++;
          stats.errors.push({ ledger: row.id, reason: v.error });
          continue;
        }

        const prep = await prepareAttempt({
          resourceType: "ledger",
          resourceId: row.id,
          amount: v.amount,
          phone: v.phoneLocal,
          provider,
        });

        if (!prep.canSend) {
          if (prep.reason === "already_paid") {
            stats.skipped++;
            continue;
          }
          if (prep.reason === "check_status") {
            const chk = await checkPayoutStatus(prep.attempt);
            if (chk.status === "succeeded") {
              await finalizeLedgerPaid(row.id, {
                amount: v.amount,
                method: provider,
                reference: chk.reference,
              });
              stats.succeeded++;
            } else if (chk.status === "failed") {
              stats.failed++;
              stats.errors.push({ ledger: row.id, reason: "check_failed" });
            } else {
              stats.unconfirmed++;
            }
            continue;
          }
          stats.skipped++;
          continue;
        }

        const sent = await sendPayout({
          idempotencyKey: prep.idempotencyKey,
          amount: v.amount,
          phoneLocal: v.phoneLocal,
          provider,
          description: "Payout Kimoxa #" + row.id,
        });

        if (sent.status === "succeeded") {
          await finalizeLedgerPaid(row.id, {
            amount: v.amount,
            method: provider,
            reference: sent.reference,
          });
          stats.succeeded++;
        } else if (sent.status === "failed") {
          stats.failed++;
          stats.errors.push({ ledger: row.id, reason: sent.error });
        } else {
          stats.unconfirmed++;
        }
      } catch (e) {
        stats.failed++;
        stats.errors.push({ ledger: row.id, reason: e.message });
      }
    }

    return Response.json({ ok: true, stats });
  } catch (err) {
    console.error("[cron/auto-payout]", err);
    return Response.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
