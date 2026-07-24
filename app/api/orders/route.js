import sql from "@/lib/db";

const COMMISSION_RATE = 0.10; // 10 %, comme fixé dans le cahier des charges

// POST /api/orders
// Crée une commande + décrémente le stock de chaque produit, dans une transaction
// pour éviter la survente si deux acheteurs commandent en même temps.
// Enregistre aussi la commission due par boutique dans shop_commission_ledger.
// body: { items: [{ productId, quantity }], shippingAddress, phone }
export async function POST(request) {
  const userId = request.headers.get("x-user-id");

  try {
    const { items, shippingAddress, phone, paymentMethod } = await request.json();

    if (!Array.isArray(items) || items.length === 0) {
      return Response.json(
        { error: "Le panier est vide." },
        { status: 400 }
      );
    }
    if (!shippingAddress || !phone) {
      return Response.json(
        { error: "Adresse de livraison et téléphone requis." },
        { status: 400 }
      );
    }

    const allowedMethods = ["cod", "mobile_money"];
    const finalPaymentMethod = allowedMethods.includes(paymentMethod) ? paymentMethod : "cod";

    const order = await sql.begin(async (tx) => {
      let total = 0;
      const resolvedItems = [];

      for (const item of items) {
        const quantity = Number(item.quantity);
        if (!item.productId || !quantity || quantity <= 0) {
          throw new Error("Article de commande invalide.");
        }

        // FOR UPDATE verrouille la ligne le temps de la transaction,
        // empêchant deux commandes simultanées de survendre le même produit.
        const [product] = await tx`
          SELECT id, name, price, stock_quantity, shop_id
          FROM products
          WHERE id = ${item.productId}
          FOR UPDATE
        `;

        if (!product) {
          throw new Error(`Produit introuvable (id ${item.productId}).`);
        }
        if (product.stock_quantity < quantity) {
          throw new Error(
            `Stock insuffisant pour "${product.name}" (disponible : ${product.stock_quantity}).`
          );
        }

        total += Number(product.price) * quantity;
        resolvedItems.push({ product, quantity });
      }

      const [newOrder] = await tx`
        INSERT INTO orders (buyer_id, status, total, shipping_address, phone, payment_method)
        VALUES (${userId}, 'pending', ${total}, ${shippingAddress}, ${phone}, ${finalPaymentMethod})
        RETURNING id, status, total, payment_method, created_at
      `;

      // Sous-total par boutique, pour calculer la commission de chacune
      const subtotalsByShop = {};

      for (const { product, quantity } of resolvedItems) {
        await tx`
          INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase)
          VALUES (${newOrder.id}, ${product.id}, ${quantity}, ${product.price})
        `;

        await tx`
          UPDATE products
          SET stock_quantity = stock_quantity - ${quantity}, updated_at = NOW()
          WHERE id = ${product.id}
        `;

        await tx`
          INSERT INTO stock_movements (product_id, type, quantity, reason, created_by)
          VALUES (${product.id}, 'sale', ${-quantity}, ${"Vente - commande #" + newOrder.id}, ${userId})
        `;

        const lineTotal = Number(product.price) * quantity;
        subtotalsByShop[product.shop_id] = (subtotalsByShop[product.shop_id] || 0) + lineTotal;
      }

      // Une ligne de commission par boutique impliquée dans la commande
      for (const [shopId, subtotal] of Object.entries(subtotalsByShop)) {
        const commissionAmount = Math.round(subtotal * COMMISSION_RATE);
        await tx`
          INSERT INTO shop_commission_ledger (shop_id, order_id, commission_amount, gross_amount, status)
          VALUES (${shopId}, ${newOrder.id}, ${commissionAmount}, ${subtotal}, 'due')
        `;
      }

      return newOrder;
    });

    return Response.json({ order }, { status: 201 });
  } catch (err) {
    console.error("Erreur création commande:", err);
    return Response.json(
      { error: err.message || "Erreur serveur lors de la création de la commande." },
      { status: 400 }
    );
  }
}

// GET /api/orders
// Historique des commandes de l'acheteur connecté
export async function GET(request) {
  const userId = request.headers.get("x-user-id");

  const orders = await sql`
    SELECT id, status, total, shipping_address, phone, payment_method, created_at
    FROM orders
    WHERE buyer_id = ${userId}
    ORDER BY created_at DESC
  `;

  // On attache le détail des articles pour chaque commande
  for (const order of orders) {
    order.items = await sql`
      SELECT oi.quantity, oi.price_at_purchase, p.name AS product_name
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ${order.id}
    `;
  }

  return Response.json({ orders });
}
