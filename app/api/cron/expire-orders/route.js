import sql from "@/lib/db";

// CRON horaire : expire les commandes NON payées > 24h (restock + annulation)
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
    const expired = await sql.begin(async (tx) => {
      const orders = await tx`
        SELECT id FROM orders
        WHERE status = 'pending'
          AND created_at < NOW() - INTERVAL '24 hours'
      `;

      for (const o of orders) {
        const items = await tx`
          SELECT product_id, quantity FROM order_items WHERE order_id = ${o.id}
        `;
        for (const it of items) {
          await tx`
            UPDATE products SET stock_quantity = stock_quantity + ${it.quantity}
            WHERE id = ${it.product_id}
          `;
        }

        await tx`
          UPDATE shop_commission_ledger
          SET status = 'voided', commission_amount = 0, payout_amount = 0, delivery_status = 'cancelled'
          WHERE order_id = ${o.id}
        `;

        await tx`UPDATE orders SET status = 'cancelled' WHERE id = ${o.id}`;

        await tx`
          INSERT INTO order_status_history (order_id, from_status, to_status, actor_id, actor_role, reason)
          VALUES (${o.id}, 'pending', 'cancelled', 0, 'system', 'auto_expire_unpaid_24h')
        `;
      }
      return orders;
    });

    return Response.json({ ok: true, expiredCount: expired.length });
  } catch (err) {
    console.error("[cron/expire-orders]", err);
    return Response.json({ error: "Erreur serveur." }, { status: 500 });
  }
}