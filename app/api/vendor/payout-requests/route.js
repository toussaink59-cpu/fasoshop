import sql from "@/lib/db";

export async function GET(request) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return Response.json({ error: "Non authentifie." }, { status: 401 });

  const [shop] = await sql`SELECT id FROM shops WHERE vendor_id = ${userId}`;
  if (!shop) return Response.json({ requests: [] });

  const rows = await sql`
    SELECT id, amount, status, created_at, admin_notes, processed_at
    FROM payout_requests
    WHERE shop_id = ${shop.id}
    ORDER BY created_at DESC
    LIMIT 20
  `;
  return Response.json({ requests: rows });
}

export async function POST(request) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return Response.json({ error: "Non authentifie." }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "JSON invalide" }, { status: 400 }); }

  const amount = Number(body?.amount);
  if (!amount || amount < 1000) {
    return Response.json({ error: "Montant minimum de reversement : 1 000 FCFA." }, { status: 400 });
  }

  const [shop] = await sql`
    SELECT s.id, s.status, s.mobile_money_number, s.mobile_money_operator
    FROM shops s WHERE s.vendor_id = ${userId}
  `;
  if (!shop) return Response.json({ error: "Boutique introuvable." }, { status: 404 });
  if (shop.status !== 'active') {
    return Response.json({ error: "Boutique non vérifiée. Les reversements sont réservés aux boutiques vérifiées." }, { status: 403 });
  }
  if (!shop.mobile_money_number) {
    return Response.json({ error: "Renseignez d'abord votre numéro Mobile Money dans 'Compte vendeur'." }, { status: 400 });
  }

// P0-02 (audit) : atomicite des demandes de reversement
  // P0-02 (audit) : TOUT en transaction + FOR UPDATE sur le shop pour
  // verrouiller la ligne et empecher tout calcul concurrent. Double-check
  // du available APRES verrou pour neutraliser la race condition.
  let req;
  try {
    req = await sql.begin(async (tx) => {
      // Verrouiller la ligne du shop (serialise les demandes concurrentes)
      const [lockedShop] = await tx`
        SELECT id FROM shops WHERE id = ${shop.id} FOR UPDATE
      `;
      if (!lockedShop) throw Object.assign(new Error("Boutique introuvable."), { code: "shop_missing" });

      // Verifier qu'aucune demande pending n'existe (sous verrou)
      const [pending] = await tx`
        SELECT id FROM payout_requests WHERE shop_id = ${shop.id} AND status = 'pending'
      `;
      if (pending) throw Object.assign(new Error("Une demande est deja en cours de traitement par l'admin."), { code: "pending_exists" });

      // Recalculer available SOUS verrou (chiffres fiables)
      const [pendingSum] = await tx`
        SELECT COALESCE(SUM(amount), 0)::int AS sum FROM payout_requests
        WHERE shop_id = ${shop.id} AND status IN ('pending', 'approved')
      `;
      const [totalReleased] = await tx`
        SELECT COALESCE(SUM(scl.payout_amount), 0)::int AS total
        FROM shop_commission_ledger scl
        WHERE scl.shop_id = ${shop.id} AND scl.payout_status = 'released'
      `;
      const alreadyRequested = pendingSum?.sum || 0;
      const available = (totalReleased?.total || 0) - alreadyRequested;

      if (amount > available) {
        throw Object.assign(new Error(
          "Montant demande (" + amount.toLocaleString("fr-FR") + " FCFA) superieur au disponible (" + available.toLocaleString("fr-FR") + " FCFA)."
        ), { code: "insufficient" });
      }

      const [inserted] = await tx`
        INSERT INTO payout_requests (shop_id, amount, status, created_at)
        VALUES (${shop.id}, ${amount}, 'pending', NOW())
        RETURNING id, amount, status, created_at
      `;
      return inserted;
    });
  } catch (txErr) {
    const msg = txErr?.message || "Erreur serveur.";
    if (txErr?.code === "pending_exists" || txErr?.code === "insufficient" || txErr?.code === "shop_missing") {
      return Response.json({ error: msg }, { status: 400 });
    }
    // Violation de contrainte unique (si migration 001 appliquee)
    if (/duplicate|unique/i.test(msg)) {
      return Response.json({ error: "Une demande est deja en cours de traitement par l'admin." }, { status: 400 });
    }
    console.error("[payout-requests POST]", msg);
    return Response.json({ error: "Erreur serveur." }, { status: 500 });
  }

  return Response.json({ request: req, success: true });
}
