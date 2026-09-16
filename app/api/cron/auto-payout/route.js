// app/api/cron/auto-payout

export const runtime = "nodejs";

// File de rattrapage des reversements vendeur.
//
// Sélectionne les lignes "released" non soldées puis délègue
// chaque opération à triggerAutoPayoutForLedger(), qui assure
// l'idempotence, la vérification fournisseur et la finalisation.
//
// Sécurité :
// - CRON_SECRET obligatoire
// - x-cron-secret OU Authorization: Bearer <CRON_SECRET>
// - comparaison en temps constant
// - route désactivée si aucun secret n'est configuré

import crypto from "crypto";
import sql from "@/lib/db";
import { triggerAutoPayoutForLedger } from "@/lib/payout-release";

const BATCH_LIMIT = 20;

export async function GET(request) {
  // =========================================================
  // 1. Vérification de la configuration
  // =========================================================

  const expected = process.env.CRON_SECRET || "";

  if (!expected) {
    return Response.json(
      { error: "Not found." },
      { status: 404 }
    );
  }

  // =========================================================
  // 2. Authentification CRON
  // =========================================================

  const provided =
    request.headers.get("x-cron-secret") ||
    (
      request.headers.get("authorization") || ""
    ).replace(
      /^Bearer\s+/i,
      ""
    ) ||
    "";

  const providedBuffer =
    Buffer.from(
      String(provided),
      "utf8"
    );

  const expectedBuffer =
    Buffer.from(
      String(expected),
      "utf8"
    );

  if (
    providedBuffer.length !==
      expectedBuffer.length ||
    !crypto.timingSafeEqual(
      providedBuffer,
      expectedBuffer
    )
  ) {
    return Response.json(
      { error: "Not found." },
      { status: 404 }
    );
  }

  // =========================================================
  // 3. Sélection des reversements à traiter
  // =========================================================
  //
  // IMPORTANT :
  // Le verrouillage / l'idempotence réelle ne se fait PAS ici.
  // Elle est assurée par prepareAttempt() dans lib/payouts.js.
  //
  // Cela permet également à deux exécutions CRON concurrentes
  // de rester sûres.
  // =========================================================

  const rows = await sql`
    SELECT l.id
    FROM shop_commission_ledger l
    WHERE l.payout_status = 'released'
      AND NOT EXISTS (
        SELECT 1
        FROM payout_attempts pa
        WHERE pa.resource_type = 'ledger'
          AND pa.resource_id = l.id::text
          AND pa.status IN (
            'pending',
            'unconfirmed'
          )
          AND pa.updated_at >
            NOW() - INTERVAL '10 minutes'
      )
    ORDER BY
      l.payout_released_at ASC NULLS LAST
    LIMIT ${BATCH_LIMIT}
  `;

  // =========================================================
  // 4. Résumé d'exécution
  // =========================================================

  const summary = {
    scanned: rows.length,
    paid: 0,
    pending: 0,
    failed: 0,
    skipped: 0,
    errors: 0,
  };

  // =========================================================
  // 5. Traitement séquentiel
  // =========================================================

  for (const row of rows) {
    try {
      const result =
        await triggerAutoPayoutForLedger(
          row.id
        );

      switch (result.status) {
        case "paid":
          summary.paid += 1;
          break;

        case "pending":
        case "unconfirmed":
          summary.pending += 1;
          break;

        case "failed":
          summary.failed += 1;
          break;

        case "skipped":
          summary.skipped += 1;
          break;

        case "error":
        default:
          summary.errors += 1;
          break;
      }
    } catch (err) {
      // Défense supplémentaire : une ligne défaillante
      // ne doit pas arrêter tout le batch.
      summary.errors += 1;

      console.error(
        "[cron/auto-payout] ledger",
        row.id,
        ":",
        err?.message || err
      );
    }
  }

  // =========================================================
  // 6. Résultat
  // =========================================================

  return Response.json({
    ok: true,
    ...summary,
  });
}