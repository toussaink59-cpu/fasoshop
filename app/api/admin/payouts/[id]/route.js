import sql from "@/lib/db";
import { rateLimit, clientKey } from "@/lib/rate-limit";

const ALLOWED_PAYMENT_METHODS = ["orange_money", "moov_money", "bank_transfer", "cash"];

// 🔒 Validation stricte
function sanitize(str, maxLength = 200) {
  if (typeof str !== "string") return "";
  return str.replace(/[<>"'`$\\]/g, "").trim().slice(0, maxLength);
}

// POST /api/admin/payouts/[id] — paiement effectif au vendeur (sécurité militaire)
export async function POST(request, { params }) {
  const userId = request.headers.get("x-user-id");
  const userRole = request.headers.get("x-user-role");

  // 🔒 1) Vérification rôle explicite
  if (!userId || userRole !== "admin") {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }

  // 🔒 2) Rate limit AGRESSIF : max 1 paiement par 10 secondes
  // Un humain ne peut pas payer plus vite → protection contre script/compromission
  const key = `admin-payout:${userId}`;
  if (!rateLimit(key, { limit: 1, windowMs: 10_000 })) {
    return Response.json(
      { error: "Veuillez patienter avant d'effectuer un autre paiement." },
      { status: 429 }
    );
  }

  try {
    // 🔒 3) Validation ID strict
    const { id } = await params;
    const ledgerId = Number(id);
    if (!Number.isInteger(ledgerId) || ledgerId <= 0) {
      return Response.json({ error: "Payout invalide." }, { status: 400 });
    }

    // 🔒 4) Vérification admin actif
    const [admin] = await sql`
      SELECT id, role, status FROM users WHERE id = ${userId}
    `;
    if (!admin || admin.role !== "admin" || admin.status === "suspended") {
      return Response.json({ error: "Accès refusé." }, { status: 403 });
    }

    // 🔒 5) Validation données paiement (obligatoires !)
    const body = await request.json();
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

    // 🔒 6) Transaction atomique + verrou FOR UPDATE
    const result = await sql.begin(async (tx) => {
      // Verrouiller la ligne pour éviter double paiement
      const [ledger] = await tx`
        SELECT l.id, l.payout_amount, l.payout_status, l.shop_id
        FROM shop_commission_ledger l
        WHERE l.id = ${ledgerId}
        FOR UPDATE
      `;

      if (!ledger) {
        throw new Error("Payout introuvable.");
      }
      if (ledger.payout_status !== "released") {
        throw new Error("Payout non disponible pour paiement.");
      }

      // 🔒 7) Vérification que le vendeur a un moyen de paiement configuré
      const [shop] = await tx`
        SELECT mobile_money_number, mobile_money_provider
        FROM shops
        WHERE id = ${ledger.shop_id}
      `;
      if (!shop || (!shop.mobile_money_number && paymentMethod !== "cash" && paymentMethod !== "bank_transfer")) {
        throw new Error("Le vendeur n'a pas de moyen de paiement configuré.");
      }

      // 🔒 8) Vérification cohérence montant (tolérance 1%)
      const expectedAmount = Number(ledger.payout_amount);
      const diff = Math.abs(amountPaid - expectedAmount) / expectedAmount;
      if (diff > 0.01) {
        throw new Error("Le montant payé ne correspond pas au montant dû.");
      }

      // 🔒 9) Mise à jour statut payout
      await tx`
        UPDATE shop_commission_ledger
        SET payout_status = 'paid', payout_paid_at = NOW()
        WHERE id = ${ledgerId}
      `;

      // 🔒 10) Enregistrement transaction dans table dédiée
      await tx`
        INSERT INTO admin_payout_transactions 
          (ledger_id, admin_id, amount_paid, payment_method, transaction_reference, notes, ip_address)
        VALUES (${ledgerId}, ${userId}, ${amountPaid}, ${paymentMethod}, 
                ${transactionReference}, ${notes || null}, ${clientKey(request)})
      `;

      // 🔒 11) Audit log détaillé
      await tx`
        INSERT INTO security_audit_log (user_id, action, resource_type, resource_id, ip_address)
        VALUES (${userId}, 'payout_paid', 'payout', ${ledgerId}, ${clientKey(request)})
      `.catch(() => {});

      return { ledgerId, amountPaid, paymentMethod };
    });

    return Response.json({ ok: true, payout: result }, { status: 200 });
  } catch (err) {
    console.error("[admin/payouts POST]", err.message);
    // 🔒 12) Message générique (ne révèle rien à l'attaquant)
    return Response.json({ error: "Impossible de traiter le paiement." }, { status: 400 });
  }
}
