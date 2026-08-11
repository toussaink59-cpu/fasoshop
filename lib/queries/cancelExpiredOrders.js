import sql from "@/lib/db";
import { sendMail } from "@/lib/email";

/**
 * Annule les commandes pending expirées et restaure le stock.
 * Stratégie "lazy" : appelée avant les lectures de commandes/stock.
 * Idempotente et sûre en concurrence (UPDATE conditionnel).
 *
 * @returns {number} nombre de commandes annulées
 */
export async function cancelExpiredOrders() {
  try {
    const expiredOrders = await sql`
      SELECT id, buyer_id, created_at
      FROM orders
      WHERE status = 'pending'
        AND expires_at IS NOT NULL
        AND expires_at < NOW()
      LIMIT 50
    `;

    if (expiredOrders.length === 0) return 0;

    let cancelledCount = 0;

    for (const order of expiredOrders) {
      const vendorEmails = [];

      await sql.begin(async (tx) => {
        // 🔒 Garde anti-concurrence : seul le premier appel annule la commande
        const [locked] = await tx`
          UPDATE orders
          SET status = 'cancelled'
          WHERE id = ${order.id} AND status = 'pending'
          RETURNING id
        `;
        if (!locked) return; // déjà annulée par un autre appel

        // 1) Récupérer les items + vendors concernés
        const items = await tx`
          SELECT oi.product_id, oi.quantity, s.vendor_id, u.email AS vendor_email
          FROM order_items oi
          JOIN products p ON p.id = oi.product_id
          JOIN shops s ON s.id = p.shop_id
          JOIN users u ON u.id = s.vendor_id
          WHERE oi.order_id = ${order.id}
        `;

        // 2) Restaurer le stock produit par produit
        for (const item of items) {
          await tx`
            UPDATE products
            SET stock_quantity = stock_quantity + ${item.quantity}, updated_at = NOW()
            WHERE id = ${item.product_id}
          `;
          await tx`
            INSERT INTO stock_movements (product_id, type, quantity, reason)
            VALUES (${item.product_id}, 'adjustment', ${item.quantity},
                    ${`Restauration stock - commande #${order.id} expirée`})
          `;
        }

        // 3) Nettoyer les entrées financières de la commande annulée
        await tx`DELETE FROM shop_commission_ledger WHERE order_id = ${order.id}`;
        await tx`DELETE FROM courier_payouts WHERE order_id = ${order.id}`;

        // 4) Audit log
        await tx`
          INSERT INTO security_audit_log (user_id, action, resource_type, resource_id, ip_address)
          VALUES (${order.buyer_id}, 'order_expired', 'order', ${order.id}, 'system')
        `.catch(() => {});

        for (const e of [...new Set(items.map((i) => i.vendor_email))]) {
          vendorEmails.push(e);
        }
      });

      // 5) Emails APRÈS la transaction (ne bloquent jamais l'annulation)
      for (const email of vendorEmails) {
        await sendMail({
          to: email,
          subject: "Commande expirée — stock restauré",
          text: `Bonjour,\n\nLa commande #${order.id} du ${new Date(order.created_at).toLocaleDateString("fr-FR")} a expiré : le client n'a pas confirmé dans les 24 heures.\n\nLe stock des produits concernés a été automatiquement restauré et est de nouveau disponible à la vente.\n\nL'équipe Kimoxa`,
        }).catch(() => {});
      }

      cancelledCount++;
    }

    return cancelledCount;
  } catch (err) {
    console.error("[cancelExpiredOrders]", err);
    return 0;
  }
}
