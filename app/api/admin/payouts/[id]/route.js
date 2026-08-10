import sql from "@/lib/db";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { sendPayout, payoutMode } from "@/lib/payouts";

const ALLOWED_PAYMENT_METHODS = ["orange_money", "moov_money", "bank_transfer", "cash"];

function sanitize(str, maxLength = 200) {
  if (typeof str !== "string") return "";
  return str.replace(/[<>"'`$\\]/g, "").trim().slice(0, maxLength);
}

// POST /api/admin/payouts/[id]
// mode "auto"   : l'API payout envoie l'argent + retourne la référence
// mode "manual" : l'admin saisit la référence (secours / espèces / virement)
export async function POST(request, { params }) {
  const userId = request.headers.get("x-user-id");
  const userRole = request.headers.get("x-user-role");

  if (!userId || userRole !== "admin") {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }

  const key = `admin-payout:${userId}`;
  if (!rateLimit(key, { limit: 1, windowMs: 10_000 })) {
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

    // ===== Validation mode manuel =====
    let amountPaid = null;
    let paymentMethod = "";
    let transactionReference = "";
    let notes = "";

    if (!wantAuto) {
      amountPaid = Number(body.amountPaid);
      paymentMethod = String(body.paymentMethod || "").toLowerCase();
      transactionReference = sanitize(body.transactionReference, 100);
      notes = sanitize(body.notes, 500);

      if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
        return Response.json({ error: "Montant payé invalide." }, { status: 400 });
      }
      if (!ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) {
        return Response.json({ error: "Méthode de paiement invalide." }, { status: 400 });
      }
      if (!transactionReference || transactionReference.length < 5) {
        return Response.json({ error: "Référence de transaction requise." }, { status: 400 });
      }
    }

    const result = await sql.begin(async (tx) => {
      const [ledger] = await tx`
        SELECT l.id, l.payout_amount, l.payout_status, l.shop_id
        FROM shop_commission_ledger l
        WHERE l.id = ${ledgerId}
        FOR UPDATE
      `;
      if (!ledger) throw new Error("Payout introuvable.");
      if (ledger.payout_status !== "released") throw new Error("Payout non disponible pour paiement.");

      const [shop] = await tx`
        SELECT mobile_money_number, mobile_money_provider FROM shops WHERE id = ${ledger.shop_id}
      `;

      let finalAmount = amountPaid;
      let finalMethod = paymentMethod;
      let finalReference = transactionReference;

      if (wantAuto) {
        // 🤖 AUTO : l'argent part via l'API, la référence revient toute seule
        if (!shop || !shop.mobile_money_number) {
          throw new Error("Le vendeur n'a pas de numéro Mobile Money — utilisez le mode manuel.");
        }
        finalMethod = shop.mobile_money_provider === "moov" ? "moov_money" : "orange_money";
        finalAmount = Number(ledger.payout_amount);

        const sent = await sendPayout({
          amount: finalAmount,
          phone: shop.mobile_money_number,
          provider: finalMethod,
          description: `Payout Kimoxa #${ledgerId}`,
        });
        if (!sent.ok) {
          throw new Error(`Paiement auto échoué : ${sent.error} — utilisez le mode manuel.`);
        }
        finalReference = sent.reference;
      } else {
        // ✍️ MANUEL : cohérence montant + moyen de paiement vendeur
        const expected = Number(ledger.payout_amount);
        if (Math.abs(finalAmount - expected) / expected > 0.01) {
          throw new Error("Le montant payé ne correspond pas au montant dû.");
        }
        if ((finalMethod === "orange_money" || finalMethod === "moov_money") && (!shop || !shop.mobile_money_number)) {
          throw new Error("Le vendeur n'a pas de moyen de paiement configuré.");
        }
      }

      await tx`
        UPDATE shop_commission_ledger
        SET payout_status = 'paid', payout_paid_at = NOW()
        WHERE id = ${ledgerId}
      `;

      await tx`
        INSERT INTO admin_payout_transactions
          (ledger_id, admin_id, amount_paid, payment_method, transaction_reference, notes, ip_address)
        VALUES (${ledgerId}, ${userId}, ${finalAmount}, ${finalMethod}, ${finalReference}, ${notes || null}, ${clientKey(request)})
      `;

      await tx`
        INSERT INTO security_audit_log (user_id, action, resource_type, resource_id, ip_address)
        VALUES (${userId}, ${wantAuto ? "payout_paid_auto" : "payout_paid_manual"}, 'payout', ${ledgerId}, ${clientKey(request)})
      `.catch(() => {});

      return { ledgerId, amountPaid: finalAmount, paymentMethod: finalMethod, reference: finalReference, auto: wantAuto };
    });

    return Response.json({ ok: true, payout: result }, { status: 200 });
  } catch (err) {
    console.error("[admin/payouts POST]", err.message);
    const msg = String(err.message || "");
    return Response.json(
      { error: msg.includes("manuel") || msg.includes("Payout") ? msg : "Impossible de traiter le paiement." },
      { status: 400 }
    );
  }
}
