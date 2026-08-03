import sql from "@/lib/db";

// Historique des commandes de l'acheteur connecté, avec le détail par
// boutique (chaque boutique gère sa propre sous-commande et son propre
// statut de livraison).
export async function getBuyerOrders(userId) {
  const orders = await sql`
    SELECT id, status, total, shipping_address, phone, payment_method, created_at
    FROM orders
    WHERE buyer_id = ${userId}
    ORDER BY created_at DESC
  `;

  for (const order of orders) {
    const items = await sql`
      SELECT oi.quantity, oi.price_at_purchase, p.name AS product_name,
             s.id AS shop_id, s.name AS shop_name,
             COALESCE(l.delivery_status, 'preparation') AS delivery_status
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      JOIN shops s ON s.id = p.shop_id
      LEFT JOIN shop_commission_ledger l ON l.order_id = oi.order_id AND l.shop_id = s.id
      WHERE oi.order_id = ${order.id}
    `;

    const shopsMap = {};
    for (const item of items) {
      if (!shopsMap[item.shop_id]) {
        shopsMap[item.shop_id] = {
          shopId: item.shop_id,
          shopName: item.shop_name,
          deliveryStatus: item.delivery_status,
          items: [],
        };
      }
      shopsMap[item.shop_id].items.push({
        productName: item.product_name,
        quantity: item.quantity,
        priceAtPurchase: item.price_at_purchase,
      });
    }

    order.subOrders = Object.values(shopsMap);
  }

  return orders;
}
