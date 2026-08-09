import sql from "@/lib/db";
import { getDeliveryFee } from "@/lib/delivery";

const COMMISSION_RATE = 0.055; // 5,5 % — commission Kimoxa sur chaque sous-commande

// Détection de ville depuis l'adresse (même logique que côté client)
function detectCityFromAddress(address) {
  const addr = (address || "").toLowerCase();
  if (addr.includes("ouaga") || addr.includes("kadiogo")) return "Ouagadougou";
  return address ? "Autre" : "";
}

// POST /api/orders
// Crée une commande + décrémente le stock, dans une transaction.
// Enregistre la commission ET le payout séquestré dans shop_commission_ledger.
// Les frais de livraison sont RECALCULÉS côté serveur (sécurité anti-fraude).
export async function POST(request) {
  const userId = request.headers.get("x-user-id");

  try {
    const { items, shippingAddress, phone, paymentMethod } = await request.json();

    if (!Array.isArray(items) || items.length === 0) {
      return Response.json({ error: "Le panier est vide." }, { status: 400 });
    }
    if (!shippingAddress || !phone) {
      return Response.json({ error: "Adresse de livraison et téléphone requis." }, { status: 400 });
    }

    const allowedMethods = ["cod", "mobile_money"];
    const finalPaymentMethod = allowedMethods.includes(paymentMethod) ? paymentMethod : "cod";

    const order = await sql.begin(async (tx) => {
      let subtotal = 0;
      const resolvedItems = [];

      for (const item of items) {
        const quantity = Number(item.quantity);
        if (!item.productId || !quantity || quantity <= 0) {
          throw new Error("Article de commande invalide.");
        }

        const [product] = await tx`
          SELECT id, name, price, stock_quantity, shop_id
          FROM products
          WHERE id = ${item.productId}
          FOR UPDATE
        `;

        if (!product) throw new Error(`Produit introuvable (id ${item.productId}).`);
        if (product.stock_quantity < quantity) {
          throw new Error(`Stock insuffisant pour "${product.name}" (disponible : ${product.stock_quantity}).`);
        }

        subtotal += Number(product.price) * quantity;
        resolvedItems.push({ product, quantity });
      }

      // ===== CALCUL FRAIS DE LIVRAISON CÔTÉ SERVEUR =====
      const city = detectCityFromAddress(shippingAddress);
      const deliveryFee = getDeliveryFee(city, subtotal);
      const totalWithDelivery = subtotal + deliveryFee;

      const [newOrder] = await tx`
        INSERT INTO orders (buyer_id, status, total, shipping_address, phone, payment_method, delivery_fee)
        VALUES (${userId}, 'pending', ${totalWithDelivery}, ${shippingAddress}, ${phone}, ${finalPaymentMethod}, ${deliveryFee})
        RETURNING id, status, total, payment_method, delivery_fee, created_at
      `;

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

      // 💰 PAYOUT : séquestre + commission 5,5% par boutique
      // La commission est calculée sur le sous-total PRODUITS (pas sur la livraison)
      for (const [shopId, shopSubtotal] of Object.entries(subtotalsByShop)) {
        const commissionAmount = Math.round(shopSubtotal * COMMISSION_RATE);
        const payoutAmount = shopSubtotal - commissionAmount;
        await tx`
          INSERT INTO shop_commission_ledger
            (shop_id, order_id, commission_amount, gross_amount, status,
             commission_rate, payout_amount, payout_status)
          VALUES (${shopId}, ${newOrder.id}, ${commissionAmount}, ${shopSubtotal}, 'due',
                  5.5, ${payoutAmount}, 'held')
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

export async function GET(request) {
  const userId = request.headers.get("x-user-id");
  const { getBuyerOrders } = await import("@/lib/queries/orders");
  const orders = await getBuyerOrders(userId);
  return Response.json({ orders });
}