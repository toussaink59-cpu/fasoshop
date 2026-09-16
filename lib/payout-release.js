// Libération et reversement automatique des fonds vendeur.
//
// Déclenchée à deux endroits :
//   1. app/api/orders/[id]/confirm-receipt — dès que l'acheteur confirme
//      la réception d'une commande payée par Mobile Money ;
//   2. app/api/cron/auto-payout — file de rattrapage des reversements
//      restés en attente.
//
// Garanties :
//   - idempotence via payout_attempts / prepareAttempt()
//   - protection contre les courses concurrentes
//   - finalisation ledger atomique
//   - jamais de double envoi volontaire
//   - une réponse ambiguë reste "unconfirmed"
//   - un échec explicite reste "failed"
//   - une erreur DB après confirmation fournisseur est signalée
//   - aucune erreur interne n'est silencieusement transformée en "paid"

import sql from "@/lib/db";
import {
  MIN_PAYOUT,
  MAX_PAYOUT,
  validatePayout,
  prepareAttempt,
  sendPayout,
  checkPayoutStatus,
} from "@/lib/payouts";
import { createNotification } from "@/lib/notifications";

// ---------------------------------------------------------------
// Extraction robuste de la clé d'idempotence
// ---------------------------------------------------------------

function getAttemptIdempotencyKey(
  attemptResult
) {
  return (
    attemptResult?.idempotencyKey ||
    attemptResult?.idempotency_key ||
    attemptResult?.attempt
      ?.idempotencyKey ||
    attemptResult?.attempt
      ?.idempotency_key ||
    null
  );
}

// ---------------------------------------------------------------
// Finalisation : ledger -> paid
//
// Transaction courte, sans aucun appel réseau.
// ---------------------------------------------------------------

async function finalizeLedgerPaid({
  ledgerId,
  reference,
  idempotencyKey,
}) {
  return sql.begin(async (tx) => {
    const [ledger] = await tx`
      SELECT
        id,
        payout_status,
        shop_id,
        payout_amount
      FROM shop_commission_ledger
      WHERE id = ${ledgerId}
      FOR UPDATE
    `;

    if (!ledger) {
      throw Object.assign(
        new Error(
          "Ligne de commission introuvable."
        ),
        {
          code: "not_found",
        }
      );
    }

    // Idempotence : déjà finalisé.
    if (
      ledger.payout_status === "paid"
    ) {
      return {
        already: true,
        ledger,
      };
    }

    // Protection métier.
    if (
      ledger.payout_status !==
      "released"
    ) {
      throw Object.assign(
        new Error(
          "La ligne n'est pas en attente de reversement."
        ),
        {
          code: "bad_status",
        }
      );
    }

    // -----------------------------------------------------------
    // 1. Ledger -> paid
    // -----------------------------------------------------------

    const [updatedLedger] =
      await tx`
        UPDATE shop_commission_ledger
        SET
          payout_status = 'paid',
          payout_paid_at = NOW()
        WHERE id = ${ledgerId}
          AND payout_status = 'released'
        RETURNING id, shop_id, payout_amount
      `;

    if (!updatedLedger) {
      // Une autre exécution a pu finaliser entre-temps.
      const [current] =
        await tx`
          SELECT
            id,
            payout_status,
            shop_id,
            payout_amount
          FROM shop_commission_ledger
          WHERE id = ${ledgerId}
        `;

      if (
        current?.payout_status ===
        "paid"
      ) {
        return {
          already: true,
          ledger: current,
        };
      }

      throw Object.assign(
        new Error(
          "Impossible de finaliser le reversement."
        ),
        {
          code: "finalization_failed",
        }
      );
    }

    // -----------------------------------------------------------
    // 2. Tentative -> succeeded
    // -----------------------------------------------------------

    if (idempotencyKey) {
      await tx`
        UPDATE payout_attempts
        SET
          status = 'succeeded',
          provider_reference =
            ${reference || null},
          error_message = NULL,
          updated_at = NOW()
        WHERE idempotency_key =
          ${idempotencyKey}
      `;
    }

    // -----------------------------------------------------------
    // 3. Audit financier
    // -----------------------------------------------------------

    await tx`
      INSERT INTO security_audit_log
        (
          action,
          resource_type,
          resource_id
        )
      VALUES
        (
          'payout_auto_paid',
          'payout',
          ${ledgerId}
        )
    `.catch(() => {});

    return {
      already: false,
      ledger: updatedLedger,
    };
  });
}

// ---------------------------------------------------------------
// Notification vendeur
//
// Best-effort : jamais bloquante.
// ---------------------------------------------------------------

async function notifyVendorPaid(
  shopId,
  amount
) {
  try {
    const [vendor] =
      await sql`
        SELECT u.id
        FROM users u
        JOIN shops s
          ON s.vendor_id = u.id
        WHERE s.id = ${shopId}
        LIMIT 1
      `;

    if (vendor) {
      await createNotification({
        userId: vendor.id,
        type: "payout_paid",
        title: "Reversement envoyé",
        body:
          `${Number(
            amount || 0
          ).toLocaleString(
            "fr-FR"
          )} FCFA versés sur votre Mobile Money`,
        link: "/vendor/revenue",
        data: {
          shopId: Number(shopId),
        },
      });
    }
  } catch (err) {
    console.error(
      "[payout-release] notification vendeur :",
      err.message
    );
  }
}

// ---------------------------------------------------------------
// Point d'entrée
// ---------------------------------------------------------------

export async function triggerAutoPayoutForLedger(
  ledgerId
) {
  try {
    // -----------------------------------------------------------
    // 1. Vérification ledger
    // -----------------------------------------------------------

    const [ledger] =
      await sql`
        SELECT
          id,
          payout_status,
          payout_amount,
          shop_id
        FROM shop_commission_ledger
        WHERE id = ${ledgerId}
      `;

    if (!ledger) {
      return {
        status: "skipped",
        reason: "not_found",
      };
    }

    if (
      ledger.payout_status !==
      "released"
    ) {
      return {
        status: "skipped",
        reason: "not_released",
      };
    }

    // -----------------------------------------------------------
    // 2. Validation du montant
    // -----------------------------------------------------------

    const amount =
      Number(
        ledger.payout_amount
      );

    if (
      !Number.isFinite(amount)
    ) {
      return {
        status: "skipped",
        reason: "amount_invalid",
      };
    }

    if (amount < MIN_PAYOUT) {
      return {
        status: "skipped",
        reason: "below_minimum",
      };
    }

    if (amount > MAX_PAYOUT) {
      return {
        status: "skipped",
        reason: "above_maximum",
      };
    }

    // -----------------------------------------------------------
    // 3. Moyen de paiement vendeur
    // -----------------------------------------------------------

    const [shop] =
      await sql`
        SELECT
          mobile_money_number,
          mobile_money_provider
        FROM shops
        WHERE id = ${ledger.shop_id}
      `;

    if (!shop?.mobile_money_number) {
      return {
        status: "skipped",
        reason:
          "vendor_phone_missing",
      };
    }

    const provider =
      shop.mobile_money_provider ===
      "moov"
        ? "moov_money"
        : "orange_money";

    // -----------------------------------------------------------
    // 4. Validation métier
    // -----------------------------------------------------------

    const validation =
      validatePayout({
        amount,
        phone:
          shop.mobile_money_number,
        provider,
      });

    if (!validation.ok) {
      return {
        status: "skipped",
        reason:
          "validation",
        error:
          validation.error,
      };
    }

    // -----------------------------------------------------------
    // 5. Préparation idempotente
    // -----------------------------------------------------------

    const prep =
      await prepareAttempt({
        resourceType:
          "ledger",
        resourceId:
          String(ledgerId),
        amount:
          validation.amount,
        phone:
          validation.phoneLocal,
        provider,
      });

    // -----------------------------------------------------------
    // 6. Tentative existante
    // -----------------------------------------------------------

    if (!prep.canSend) {
      // ---------------------------------------------------------
      // Déjà payé / déjà confirmé
      // ---------------------------------------------------------

      if (
        prep.reason ===
        "already_paid"
      ) {
        try {
          const finalized =
            await finalizeLedgerPaid({
              ledgerId,
              reference:
                prep.attempt
                  ?.provider_reference ||
                null,
              idempotencyKey:
                getAttemptIdempotencyKey(
                  prep
                ),
            });

          await notifyVendorPaid(
            ledger.shop_id,
            validation.amount
          );

          return {
            status: "paid",
            idempotent: true,
            alreadyFinalized:
              finalized.already === true,
            reference:
              prep.attempt
                ?.provider_reference ||
              null,
          };
        } catch (err) {
          return {
            status: "error",
            error:
              err?.message ||
              "Impossible de finaliser le reversement déjà confirmé.",
          };
        }
      }

      // ---------------------------------------------------------
      // Tentative pending/unconfirmed
      // ---------------------------------------------------------

      let check;

      try {
        check =
          await checkPayoutStatus(
            prep.attempt
          );
      } catch (err) {
        return {
          status: "error",
          error:
            err?.message ||
            "Impossible de vérifier le statut du reversement.",
        };
      }

      // ---------------------------------------------------------
      // Fournisseur => succès
      // ---------------------------------------------------------

      if (
        check.status ===
        "succeeded"
      ) {
        try {
          const finalized =
            await finalizeLedgerPaid({
              ledgerId,
              reference:
                check.reference ||
                prep.attempt
                  ?.provider_reference ||
                null,
              idempotencyKey:
                getAttemptIdempotencyKey(
                  prep
                ),
            });

          await notifyVendorPaid(
            ledger.shop_id,
            validation.amount
          );

          return {
            status: "paid",
            recovered: true,
            reference:
              check.reference ||
              prep.attempt
                ?.provider_reference ||
              null,
            idempotent:
              finalized.already === true,
          };
        } catch (err) {
          return {
            status: "error",
            error:
              err?.message ||
              "Paiement confirmé mais finalisation DB impossible.",
            reference:
              check.reference ||
              prep.attempt
                ?.provider_reference ||
              null,
          };
        }
      }

      // ---------------------------------------------------------
      // Fournisseur => échec explicite
      // ---------------------------------------------------------

      if (
        check.status ===
        "failed"
      ) {
        return {
          status: "failed",
          error:
            check.error ||
            "La tentative précédente a échoué.",
        };
      }

      // ---------------------------------------------------------
      // Statut ambigu / encore en cours
      // ---------------------------------------------------------

      return {
        status: "unconfirmed",
        providerStatus:
          check.status,
      };
    }

    // -----------------------------------------------------------
    // 7. Nouvelle tentative autorisée
    // -----------------------------------------------------------

    const sent =
      await sendPayout({
        idempotencyKey:
          prep.idempotencyKey,
        amount:
          validation.amount,
        phoneLocal:
          validation.phoneLocal,
        provider,
        description:
          "Reversement Kimoxa — commande livrée",
      });

    // -----------------------------------------------------------
    // 8. Succès fournisseur
    // -----------------------------------------------------------

    if (
      sent.status ===
      "succeeded"
    ) {
      try {
        const finalized =
          await finalizeLedgerPaid({
            ledgerId,
            reference:
              sent.reference,
            idempotencyKey:
              prep.idempotencyKey,
          });

        await notifyVendorPaid(
          ledger.shop_id,
          validation.amount
        );

        return {
          status: "paid",
          reference:
            sent.reference,
          idempotent:
            finalized.already === true,
        };
      } catch (err) {
        // Ne jamais transformer une erreur DB en "paid".
        //
        // Le fournisseur a confirmé le paiement.
        // La DB doit donc être régularisée, mais aucun second
        // envoi aveugle ne doit être effectué.
        return {
          status: "error",
          error:
            err?.message ||
            "Paiement envoyé mais finalisation DB impossible.",
          reference:
            sent.reference,
        };
      }
    }

    // -----------------------------------------------------------
    // 9. Échec explicite fournisseur
    // -----------------------------------------------------------

    if (
      sent.status ===
      "failed"
    ) {
      return {
        status: "failed",
        error:
          sent.error ||
          "Le fournisseur a refusé le reversement.",
      };
    }

    // -----------------------------------------------------------
    // 10. Réponse ambiguë
    // -----------------------------------------------------------

    return {
      status: "unconfirmed",
      error:
        sent.error ||
        "Statut du reversement non confirmé.",
    };
  } catch (err) {
    console.error(
      "[payout-release] ledger",
      ledgerId,
      ":",
      err?.message || err
    );

    return {
      status: "error",
      error: String(
        err?.message || err
      ),
    };
  }
}