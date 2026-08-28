import { createNotification } from "@/lib/notifications";
import sql from "@/lib/db";
import { isValidCronAuth } from "@/lib/cronAuth";
import { sendOrderDeliveredEmail } from "@/lib/email/orders";

// CRON quotidien 3h : auto-confirme les commandes expédiées depuis 7 jours
// → libère le payout (MM) ou passe en cod_pending (espèces)
export async function POST(request) {
  // Fail-closed + comparaison timing-safe (voir lib/cronAuth.js)
  if (!isValidCronAuth(request)) {
    if (!process.env.CRON_SECRET) console.error("[cron] CRON_SECRET non defini - refus");
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
          AND h.created_at <= NOW() - INTERVAL '3 days'
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
          VALUES (${r.order_id}, ${r.shop_id}, 'shipped', 'delivered', ${r.buyer_id}, 'system_auto', 'auto_confirm_3_days')
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

 // EMAILS LIVRAISON pour chaque commande auto-confirmée (fire-and-forget)
    for (const r of processed) {
      try {
        const [buyer] = await sql`
          SELECT u.email, u.full_name FROM users u
          JOIN orders o ON o.buyer_id = u.id WHERE o.id = ${r.order_id} LIMIT 1
        `;
        const [shopRow] = await sql`SELECT name FROM shops WHERE id = ${r.shop_id} LIMIT 1`;
        if (buyer) {
          sendOrderDeliveredEmail({
            to: buyer.email,
            firstName: (buyer.full_name || "").split(" ")[0] || "Client",
            orderId: Number(r.order_id),
            shopName: shopRow?.name || "Boutique",
            autoConfirmed: true,
          }).catch(() => {});
        }
      } catch (emailErr) {
        console.error("[cron/auto-confirm] email error:", emailErr.message);
      }

      // NOTIF: auto_confirm_released - vendeur voit son reversement libéré
      try {
        const release = r.payment_method === "mobile_money" ? "released" : "cod_pending";
        const [vendorUser] = await sql`SELECT u.id FROM users u JOIN shops s ON s.vendor_id = u.id WHERE s.id = ${r.shop_id} LIMIT 1`;
        const [ledger] = await sql`SELECT payout_amount FROM shop_commission_ledger WHERE order_id = ${r.order_id} AND shop_id = ${r.shop_id} LIMIT 1`;
        if (vendorUser) {
          await createNotification({
            userId: vendorUser.id,
            type: release === "released" ? 'payout_released' : 'order_delivered',
            title: release === "released"
              ? 'Reversement libéré — ' + Number(ledger?.payout_amount || 0).toLocaleString('fr-FR') + ' FCFA'
              : 'Livraison confirmée (espèces)',
            body: release === "released"
              ? "Vos gains sont disponibles dans l'onglet Revenus"
              : "Paiement à collecter à la livraison (COD)",
            link: '/vendor/revenue',
            data: { orderId: r.order_id, shopId: r.shop_id },
          });
        }
      } catch (notifErr) {
        console.error("[cron/auto-confirm] notif error:", notifErr.message);
      }
    }
return Response.json({ ok: true, autoConfirmed: processed.length });
  } catch (err) {
    console.error("[cron/auto-confirm]", err);
    return Response.json({ error: "Erreur serveur." }, { status: 500 });
  }
}