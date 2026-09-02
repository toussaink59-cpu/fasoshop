import { createNotification } from "@/lib/notifications";
import sql from "@/lib/db";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { adminGuard } from "@/lib/adminAuth";
import {
  payoutMode,
  validatePayout,
  prepareAttempt,
  sendPayout,
  checkPayoutStatus,
  markSucceeded,
  markFailed,
  markUnconfirmed,
} from "@/lib/payouts";
import { logger, generateRequestId } from "@/lib/logger";

const ALLOWED_PAYMENT_METHODS = ["orange_money", "moov_money", "bank_transfer", "cash"];

function sanitize(str, maxLength = 200) {
  if (typeof str !== "string") return "";
  return str.replace(/[<>"'`$\\]/g, "").trim().slice(0, maxLength);
}

// Finalise le payout côté DB (transaction courte, sans appel réseau dedans)
// P0-03 (audit) : atomicite complete - markSucceeded DANS la transaction
// pour eviter l'incoherence "argent parti mais ledger non paye"
async function finalizeLedgerPaid(ledgerId, userId, ip, { amount, method, reference, notes, idempotencyKey }) {
  return sql.begin(async (tx) => {
    const [ledger] = await tx`
      SELECT id, payout_status, shop_id, payout_amount
      FROM shop_commission_ledger
      WHERE id = ${ledgerId}
      FOR UPDATE
    `;
    if (!ledger) throw Object.assign(new Error("Payout introuvable."), { code: "not_found" });
    if (ledger.payout_status === "paid") throw Object.assign(new Error("already_paid"), { code: "already_paid" });
    if (ledger.payout_status !== "released") throw Object.assign(new Error("Payout non disponible."), { code: "bad_status" });

    // Verification montant (tolerance 1%)
    const expected = Number(ledger.payout_amount);
    if (Math.abs(amount - expected) / expected > 0.01) {
      throw Object.assign(new Error("Montant incoherent."), { code: "amount_mismatch" });
    }

    // 1) Marquer payout_attempts = succeeded (atomicite avec ledger)
    if (idempotencyKey) {
      await tx`
        UPDATE payout_attempts
        SET status = 'succeeded', provider_reference = ${reference}, error_message = NULL, updated_at = NOW()
        WHERE idempotency_key = ${idempotencyKey}
      `;
    }

    // 2) Marquer ledger = paid
    await tx`
      UPDATE shop_commission_ledger
      SET payout_status = 'paid', payout_paid_at = NOW()
      WHERE id = ${ledgerId}
    `;

    // 3) Inserer transaction admin
    await tx`
      INSERT INTO admin_payout_transactions
        (ledger_id, admin_id, amount_paid, payment_method, transaction_reference, notes, ip_address)
      VALUES (${ledgerId}, ${userId}, ${amount}, ${method}, ${reference}, ${notes || null}, ${ip})
    `;

    // 4) Cloturer payout_requests du shop (uniquement si somme <= montant paye)
    const [reqSum] = await tx`
      SELECT COALESCE(SUM(amount), 0)::int AS sum
      FROM payout_requests
      WHERE shop_id = ${ledger.shop_id} AND status IN ('pending', 'approved')
    `;
    if ((reqSum?.sum || 0) <= amount) {
      await tx`
        UPDATE payout_requests
        SET status = 'paid', processed_at = NOW(), processed_by = ${userId}
        WHERE shop_id = ${ledger.shop_id} AND status IN ('pending', 'approved')
      `;
    }

    // 5) Audit log
    await tx`
      INSERT INTO security_audit_log (user_id, action, resource_type, resource_id, ip_address)
      VALUES (${userId}, 'payout_paid_atomic', 'payout', ${ledgerId}, ${ip})
    `.catch(() => {});

    return true;
  });
}

export async function POST(request, { params }) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  const guardError = await adminGuard(request);
  if (guardError) return guardError;

  const userId = request.headers.get("x-user-id");
  const userRole = request.headers.get("x-user-role");

  if (!userId || userRole !== "admin") {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }

  const key = `admin-payout:${userId}`;
  if (!(await rateLimit(key, { limit: 1, windowMs: 10_000 }))) {
    return Response.json({ error: "Veuillez patienter avant un autre paiement." }, { status: 429 });
  }

  try {
    const { id } = await params;
    const ledgerId = Number(id);
    if (!Number.isInteger(ledgerId) || ledgerId <= 0) {
      return Response.json({ error: "Payout invalide." }, { status: 400 });
    }

    const [admin] = await sql`SELECT id, role, status FROM users WHERE id = ${userId}`;
    if (!admin || admin.role !== "admin" || admin.status === "suspended") {
      return Response.json({ error: "Accès refusé." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const wantAuto = body.mode === "auto" && payoutMode() === "auto";
    const ip = clientKey(request);

    // ================= MODE AUTO =================
    if (wantAuto) {
      // --- Pré-lecture (hors transaction) ---
      const [ledger] = await sql`
        SELECT id, payout_amount, payout_status, shop_id
        FROM shop_commission_ledger WHERE id = ${ledgerId}
      `;
      if (!ledger || ledger.payout_status !== "released") {
        return Response.json({ error: "Payout non disponible pour paiement." }, { status: 400 });
      }
      const [shop] = await sql`
        SELECT mobile_money_number, mobile_money_provider FROM shops WHERE id = ${ledger.shop_id}
      `;
      const provider = shop?.mobile_money_provider === "moov" ? "moov_money" : "orange_money";

      // --- Validation métier stricte (problème 1) ---
      const v = validatePayout({
        amount: Number(ledger.payout_amount),
        phone: shop?.mobile_money_number,
        provider,
      });
      if (!v.ok) return Response.json({ error: v.error }, { status: 400 });

      // --- Idempotence (problème 2) ---
      const prep = await prepareAttempt({
        resourceType: "ledger",
        resourceId: ledgerId,
        amount: v.amount,
        phone: v.phoneLocal,
        provider,
      });

      if (!prep.canSend) {
        if (prep.reason === "already_paid") {
          return Response.json({ error: "Ce payout a déjà été payé." }, { status: 400 });
        }
        // pending AVEC référence : check de statut OBLIGATOIRE avant quoi que ce soit
        const chk = await checkPayoutStatus(prep.attempt);
        if (chk.status === "succeeded") {
          // L'argent était parti : on finalise proprement côté DB
          try {
            await finalizeLedgerPaid(ledgerId, userId, ip, {
              amount: v.amount, method: provider, reference: chk.reference, notes: "Finalisé après check de statut.",
            });
            return Response.json({ ok: true, payout: { reference: chk.reference, recovered: true } });
          } catch (e) {
            return Response.json({ error: "Paiement confirmé chez le fournisseur; régularisation DB requise." }, { status: 409 });
          }
        }
        if (chk.status === "failed") {
          return Response.json({ error: "La tentative précédente a échoué. Vous pouvez relancer le paiement." }, { status: 400 });
        }
        return Response.json({ error: "Un paiement est déjà en cours pour ce payout. Réessayez dans quelques minutes." }, { status: 409 });
      }

      // --- Envoi (hors transaction SQL) ---
      const sent = await sendPayout({
        idempotencyKey: prep.idempotencyKey,
        amount: v.amount,
        phoneLocal: v.phoneLocal,
        provider,
        description: `Payout Kimoxa #${ledgerId}`,
      });

      // P0-03 : succes fournisseur = TOUJOURS appeler finalizeLedgerPaid avec idempotencyKey
      // Si echec DB, markSucceeded a deja ete fait dans la transaction, donc on peut retry
      if (sent.status === "succeeded") {
        try {
          await finalizeLedgerPaid(ledgerId, userId, ip, {
            amount: v.amount, method: provider, reference: sent.reference, notes: null,
            idempotencyKey: prep.idempotencyKey,
          });
        } catch (e) {
          // Si already_paid, c'est OK (idempotence)
          if (e?.code === "already_paid") {
            return Response.json({ ok: true, payout: { reference: sent.reference, idempotent: true } });
          }
          // Sinon, alerter mais ne pas renvoyer 500 (l'argent est parti)
          console.error("[payout] finalizeLedgerPaid error (ledger=" + ledgerId + ", ref=" + sent.reference + "):", e.message);
          return Response.json({ error: "Paiement envoyé; régularisation DB en cours. Ne pas renvoyer.", reference: sent.reference }, { status: 500 });
        }
        return Response.json({ ok: true, payout: { reference: sent.reference } });
      }

      if (sent.status === "failed") {
        return Response.json({ error: `Paiement refusé : ${sent.error}` }, { status: 400 });
      }

      // unconfirmed : on ne renvoie JAMAIS (problèmes 2 + 3)
      return Response.json({ error: sent.error }, { status: 409 });
    }

    // ================= MODE MANUEL (inchangé, sécurisé) =================
    const amountPaid = Number(body.amountPaid);
    const paymentMethod = String(body.paymentMethod || "").toLowerCase();
    const transactionReference = sanitize(body.transactionReference, 100);
    const notes = sanitize(body.notes, 500);

    if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
      return Response.json({ error: "Montant payé invalide." }, { status: 400 });
    }
    if (!ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) {
      return Response.json({ error: "Méthode de paiement invalide." }, { status: 400 });
    }
    if (!transactionReference || transactionReference.length < 5) {
      return Response.json({ error: "Référence de transaction requise." }, { status: 400 });
    }

    await sql.begin(async (tx) => {
      const [ledger] = await tx`
        SELECT id, payout_amount, payout_status, shop_id
        FROM shop_commission_ledger WHERE id = ${ledgerId}
        FOR UPDATE
      `;
      if (!ledger) throw new Error("Payout introuvable.");
      if (ledger.payout_status !== "released") throw new Error("Payout non disponible pour paiement.");

      const expected = Number(ledger.payout_amount);
      if (Math.abs(amountPaid - expected) / expected > 0.01) {
        throw new Error("Le montant payé ne correspond pas au montant dû.");
      }
      const [shop] = await tx`
        SELECT mobile_money_number FROM shops WHERE id = ${ledger.shop_id}
      `;
      if ((paymentMethod === "orange_money" || paymentMethod === "moov_money") && !shop?.mobile_money_number) {
        throw new Error("Le vendeur n'a pas de moyen de paiement configuré.");
      }

      await tx`
        UPDATE shop_commission_ledger SET payout_status = 'paid', payout_paid_at = NOW()
        WHERE id = ${ledgerId}
      `;
      await tx`
        INSERT INTO admin_payout_transactions
          (ledger_id, admin_id, amount_paid, payment_method, transaction_reference, notes, ip_address)
        VALUES (${ledgerId}, ${userId}, ${amountPaid}, ${paymentMethod}, ${transactionReference}, ${notes || null}, ${ip})
      `;
      await tx`
        INSERT INTO security_audit_log (user_id, action, resource_type, resource_id, ip_address)
        VALUES (${userId}, 'payout_paid_manual', 'payout', ${ledgerId}, ${ip})
      `.catch(() => {});

      // P0-02 (audit) : cloture UNIQUE des demandes de reversement
      await tx`
        UPDATE payout_requests
        SET status = 'paid', processed_at = NOW(), processed_by = ${userId}
        WHERE shop_id = ${ledger.shop_id} AND status IN ('pending', 'approved')
      `;
    });

    
    // NOTIF: payout_paid - vendeur voit son reversement versé
    try {
      if (ledger && ledger.shop_id) {
        const [vendorUser] = await sql`SELECT u.id FROM users u JOIN shops s ON s.vendor_id = u.id WHERE s.id = ${ledger.shop_id} LIMIT 1`;
        if (vendorUser) {
          await createNotification({
            userId: vendorUser.id,
            type: 'payout_paid',
            title: 'Reversement envoyé',
            body: Number(amountPaid || ledger.payout_amount || 0).toLocaleString('fr-FR') + ' FCFA versés sur votre Mobile Money',
            link: '/vendor/revenue',
            data: { ledgerId: ledger.id },
          });
        }
      }
    } catch (notifErr) {
      console.error('[notif] payout_paid error:', notifErr.message);
    }

    logger.info("Admin payout processed", {
      route: "/api/admin/payouts/[id]",
      method: "POST",
      request_id: requestId,
      admin_id: userId,
      reference: transactionReference,
      duration_ms: Date.now() - startTime,
    });
    return Response.json({ ok: true, payout: { reference: transactionReference } });
  } catch (err) {
    logger.error("Admin payout failed", {
      route: "/api/admin/payouts/[id]",
      method: "POST",
      request_id: requestId,
      admin_id: userId,
      error: err.message,
      duration_ms: Date.now() - startTime,
    });
    if (err.code === "already_paid") {
      return Response.json({ error: "Ce payout a déjà été payé." }, { status: 400 });
    }
    return Response.json({ error: "Impossible de traiter le paiement." }, { status: 400 });
  }
}
