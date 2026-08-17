import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

const COMMISSION_RATE = 0.09; // 9%

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifiÃ©" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requÃªte invalide" }, { status: 400 });
  }

  const { items, shippingAddress, phone, paymentMethod, deliveryMethod } = body;

  // === Validation des entrÃ©es ===
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Panier vide" }, { status: 400 });
  }

  if (deliveryMethod === "delivery" && (!shippingAddress || !shippingAddress.trim())) {
    return NextResponse.json({ error: "Adresse de livraison requise" }, { status: 400 });
  }

  if (!phone || !phone.trim()) {
    return NextResponse.json({ error: "NumÃ©ro de tÃ©lÃ©phone requis" }, { status: 400 });
  }

  if (!["cod", "mobile_money"].includes(paymentMethod)) {
    return NextResponse.json({ error: "Mode de paiement invalide" }, { status: 400 });
  }

  if (!["delivery", "pickup"].includes(deliveryMethod)) {
    return NextResponse.json({ error: "Mode de livraison invalide" }, { status: 400 });
  }

  // === ðŸ†• CAST explicite des IDs (localStorage donne des strings) ===
  const productIds = items.map((i) => Number(i.productId)).filter((n) => Number.isInteger(n) && n > 0);

  if (productIds.length !== items.length) {
    return NextResponse.json({ error: "Produits invalides dans le panier" }, { status: 400 });
  }

  // === RÃ©solution des produits avec stock rÃ©el ===
  const products = await sql`
    SELECT p.id, p.price, p.stock_quantity, p.name, p.shop_id, p.status
    FROM products p
    WHERE p.id = ANY(${productIds}::int[])
  `;

  const productsMap = Object.fromEntries(products.map((p) => [p.id, p]));

  // VÃ©rif disponibilitÃ© + stock
  for (const item of items) {
    const pid = Number(item.productId);
    const p = productsMap[pid];
    if (!p) {
      return NextResponse.json({ error: `Produit ${pid} introuvable` }, { status: 400 });
    }
    if (p.status !== "active") {
      return NextResponse.json({ error: `Produit "${p.name}" indisponible` }, { status: 400 });
    }
    if (p.stock_quantity < item.quantity) {
      return NextResponse.json(
        { error: `Stock insuffisant pour "${p.name}" (${p.stock_quantity} restants)` },
        { status: 400 }
      );
    }
  }

  // === Chargement des boutiques ===
  const shopIds = [...new Set(products.map((p) => p.shop_id))];
  const shops = await sql`
    SELECT id, name, status, delivery_fee, offers_delivery, offers_pickup
    FROM shops
    WHERE id = ANY(${shopIds}::int[])
  `;
  const shopsMap = Object.fromEntries(shops.map((s) => [s.id, s]));

  // VÃ©rif : toutes les boutiques doivent Ãªtre actives
  for (const s of shops) {
    if (s.status !== "active") {
      return NextResponse.json(
        { error: `Boutique "${s.name}" temporairement indisponible` },
        { status: 400 }
      );
    }
  }

  // VÃ©rif : livraison Ã  domicile vs options boutique
  if (deliveryMethod === "delivery") {
    for (const s of shops) {
      if (!s.offers_delivery) {
        return NextResponse.json(
          { error: `"${s.name}" ne propose pas la livraison Ã  domicile. Choisissez le retrait.` },
          { status: 400 }
        );
      }
    }
  }
  // === Calcul des frais de livraison PAR BOUTIQUE ===
  let deliveryFee = 0;
  if (deliveryMethod === "delivery") {
    for (const s of shops) {
      deliveryFee += Number(s.delivery_fee) || 0;
    }
  }

  // === Total final ===
  const subtotalProducts = items.reduce(
    (sum, i) => sum + Number(productsMap[Number(i.productId)].price) * i.quantity,
    0
  );
  const grandTotal = Math.max(0, subtotalProducts + deliveryFee);

  // === Transaction atomique : commande + stock + ledger ===
  try {
    const result = await sql.begin(async (tx) => {
      // 1. CrÃ©ation commande
      const [newOrder] = await tx`
        INSERT INTO orders (buyer_id, shipping_address, phone, payment_method,
                            total, subtotal, delivery_fee, status, delivery_method)
        VALUES (${user.id}, ${shippingAddress || ""}, ${phone}, ${paymentMethod},
                ${grandTotal}, ${subtotalProducts}, ${deliveryFee}, 'pending', ${deliveryMethod})
        RETURNING id, total, subtotal, delivery_fee, status
      `;

      // 2. Items + dÃ©stockage
      const subtotalsByShop = {};
      for (const item of items) {
        const pid = Number(item.productId);
        const p = productsMap[pid];
        const lineTotal = Number(p.price) * item.quantity;

        await tx`
          INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase)
          VALUES (${newOrder.id}, ${p.id}, ${item.quantity}, ${Number(p.price)})
        `;

        const [upd] = await tx`
          UPDATE products
          SET stock_quantity = stock_quantity - ${item.quantity}
          WHERE id = ${p.id} AND stock_quantity >= ${item.quantity}
          RETURNING id
        `;
        if (!upd) {
          throw new Error(`Stock insuffisant pour "${p.name}" (concurrence)`);
        }

        if (!subtotalsByShop[p.shop_id]) subtotalsByShop[p.shop_id] = 0;
        subtotalsByShop[p.shop_id] += lineTotal;
      }

      // 3. Commission ledger par boutique
      for (const [shopId, shopSubtotal] of Object.entries(subtotalsByShop)) {
        const commissionAmount = Math.round(shopSubtotal * COMMISSION_RATE);
        const shopDeliveryFee =
          deliveryMethod === "delivery" ? Number(shopsMap[shopId]?.delivery_fee || 0) : 0;
        const payoutAmount = shopSubtotal - commissionAmount + shopDeliveryFee;

        await tx`
          INSERT INTO shop_commission_ledger
            (shop_id, order_id, commission_amount, gross_amount, status,
             commission_rate, payout_amount, payout_status, delivery_fee_amount)
          VALUES (${Number(shopId)}, ${newOrder.id}, ${commissionAmount}, ${shopSubtotal}, 'due',
                  9.0, ${payoutAmount}, 'held', ${shopDeliveryFee})
        `;
      }


      return newOrder;
    });

    return NextResponse.json({ order: result });
  } catch (err) {
    console.error("[orders] POST error:", err);
    return NextResponse.json(
      { error: err.message || "Erreur lors de la commande" },
      { status: 500 }
    );
  }
}
