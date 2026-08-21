import sql from "@/lib/db";

// Données complètes pour une facture (identité réelle vendeur + acheteur + articles + frais livraison)
// Obligatoire légalement au Burkina (loi commerce électronique).
export async function getInvoiceData(orderId, userId) {
  try {

  const [order] = await sql`
    SELECT o.id, o.total, o.shipping_address, o.phone, o.payment_method,
           o.created_at, o.status, o.delivery_fee,
           b.full_name AS buyer_name, b.phone AS buyer_phone, b.email AS buyer_email
    FROM orders o
    JOIN users b ON b.id = o.buyer_id
    WHERE o.id = ${orderId} AND o.buyer_id = ${userId}
  `;
  if (!order) return null;

  // Articles groupés par boutique, avec identité RÉELLE du vendeur
  const items = await sql`
    SELECT oi.quantity, oi.price_at_purchase,
           p.name AS product_name, p.id AS product_id,
           s.id AS shop_id, s.name AS shop_name, s.city AS shop_city,
           v.full_name AS vendor_name, v.phone AS vendor_phone,
           COALESCE(l.delivery_status, 'preparation') AS delivery_status
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    JOIN shops s ON s.id = p.shop_id
    JOIN users v ON v.id = s.vendor_id
    LEFT JOIN shop_commission_ledger l ON l.order_id = oi.order_id AND l.shop_id = s.id
    WHERE oi.order_id = ${order.id}
  `;

  // Grouper par boutique
  const shopsMap = new Map();
  for (const it of items) {
    if (!shopsMap.has(it.shop_id)) {
      shopsMap.set(it.shop_id, {
        shopId: it.shop_id,
        shopName: it.shop_name,
        shopCity: it.shop_city,
        vendorName: it.vendor_name,
        vendorPhone: it.vendor_phone,
        deliveryStatus: it.delivery_status,
        items: [],
        subtotal: 0,
      });
    }
    const shop = shopsMap.get(it.shop_id);
    shop.items.push({
      productName: it.product_name,
      quantity: it.quantity,
      priceAtPurchase: Number(it.price_at_purchase),
    });
    shop.subtotal += it.quantity * Number(it.price_at_purchase);
  }

  return {
    ...order,
    deliveryFee: Number(order.delivery_fee) || 0,
    subOrders: [...shopsMap.values()],
  };
  } catch (err) {
    console.error('[invoice.js:getInvoiceData] DB error:', err.message);
    return [];
  }
}