import sql from "@/lib/db";

// CRON quotidien 3h : auto-confirme les commandes expédiées depuis 7 jours
// → libère le payout (MM) ou passe en cod_pending (espèces)
export async function POST(request) {
  // Fail-closed : CRON_SECRET doit etre defini, sinon refus
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron] CRON_SECRET non defini - refus");
    return Response.json({ error: "Service indisponible." }, { status: 500 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return Response.json({ error: "Non autorise." }, { status: 401 });
  }

  try {
    const processed = await sql.begin(async (tx) => {
      const rows = await tx`
        SELECT h.order_id, h.shop_id, o.payment_method, o.buyer_id
        FROM order_status_history h
        JOIN orders o ON o.id = h.order_id
        JOIN shop_commission_ledger scl
          ON scl.order_id = h.order_id AND scl.shop_id = h.shop_id
        WHERE h.to_status = 'shipped'
          AND h.created_at <= NOW() - INTERVAL '7 days'
          AND scl.delivery_status = 'shipped'
      `;

      for (const r of rows) {
        const release = r.payment_method === "mobile_money" ? "released" : "cod_pending";

        await tx`
          UPDATE shop_commission_ledger
          SET delivery_status = 'delivered',
              payout_status = ${release},
              payout_released_at = NOW()
          WHERE order_id = ${r.order_id} AND shop_id = ${r.shop_id} AND delivery_status = 'shipped'
        `;

        await tx`
          INSERT INTO order_status_history
            (order_id, shop_id, from_status, to_status, actor_id, actor_role, reason)
          VALUES (${r.order_id}, ${r.shop_id}, 'shipped', 'delivered', ${r.buyer_id}, 'system_auto', 'auto_confirm_7_days')
        `;

        const subs = await tx`
          SELECT delivery_status FROM shop_commission_ledger WHERE order_id = ${r.order_id}
        `;
        if (subs.every((s) => s.delivery_status === "delivered")) {
          await tx`UPDATE orders SET status = 'delivered' WHERE id = ${r.order_id}`;
        }
      }
      return rows;
    });

    return Response.json({ ok: true, autoConfirmed: processed.length });
  } catch (err) {
    console.error("[cron/auto-confirm]", err);
    return Response.json({ error: "Erreur serveur." }, { status: 500 });
  }
}