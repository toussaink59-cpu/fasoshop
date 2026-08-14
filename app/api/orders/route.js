import sql from "@/lib/db";
import { getDeliveryFee } from "@/lib/delivery";
import { rateLimit, clientKey } from "@/lib/rate-limit";

const COMMISSION_RATE = 0.09; // ✅ Commission mise à jour à 9%

function detectCityFromAddress(address) {
  const addr = (address || "").toLowerCase();
  if (addr.includes("ouaga") || addr.includes("kadiogo")) return "Ouagadougou";
  return address ? "Autre" : "";
}

function sanitizeAddress(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/[;<>$`\\]/g, "")
    .replace(/--/g, "")
    .replace(/\b(drop|select|insert|update|delete|union|exec)\b/gi, "")
    .trim()
    .slice(0, 300);
}

function isValidPhone(phone) {
  return /^\+?[0-9\s\-()]{8,20}$/.test(phone);
}

function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Panier vide.");
  }
  if (items.length > 50) {
    throw new Error("Panier trop volumineux (max 50 articles).");
  }
  return items.map((item) => {
    const productId = Number(item.productId);
    const quantity = Number(item.quantity);
    if (!productId || !Number.isInteger(productId) || productId <= 0) {
      throw new Error("Article invalide.");
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      throw new Error("Quantité invalide (1-99).");
    }
    return { productId, quantity };
  });
}

export async function POST(request) {
  const userId = request.headers.get("x-user-id");
  const userRole = request.headers.get("x-user-role");

  if (!userId || userRole !== "buyer") {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }

  const key = `order:${clientKey(request)}`;
  if (!rateLimit(key, { limit: 5, windowMs: 60_000 })) {
    return Response.json(
      { error: "Trop de tentatives. Réessayez dans une minute." },
      { status: 429 }
    );
  }

  try {
    // 🆕 Expiration lazy : libère le stock des commandes expirées avant de créer
    const { cancelExpiredOrders } = await import("@/lib/queries/cancelExpiredOrders");
    await cancelExpiredOrders();

    const body = await request.json();

    const items = validateItems(body.items);
    const shippingAddress = sanitizeAddress(body.shippingAddress);
    const phone = String(body.phone || "").trim();
    const promoCode = body.promoCode ? String(body.promoCode).trim().toUpperCase().slice(0, 50) : null; // 🎁

    if (!shippingAddress || shippingAddress.length < 5) {
      return Response.json(
        { error: "Adresse trop courte (précisez quartier, rue ou repère)." },
        { status: 400 }
      );
    }
    if (!isValidPhone(phone)) {
      return Response.json({ error: "Téléphone invalide." }, { status: 400 });
    }

    const deliveryMethod = body.deliveryMethod === "pickup" ? "pickup" : "delivery";
    if (deliveryMethod === "delivery" && !shippingAddress) {
      return Response.json({ error: "Adresse requise." }, { status: 400 });
    }

    const allowedMethods = ["cod", "mobile_money"];
    const finalPaymentMethod = allowedMethods.includes(body.paymentMethod)
      ? body.paymentMethod
      : "cod";

    const finalAddress =
      deliveryMethod === "pickup"
        ? "Retrait au point relais Kimoxa (Ouagadougou)"
        : shippingAddress;

    const order = await sql.begin(async (tx) => {
      let subtotal = 0;
      const resolvedItems = [];

      for (const { productId, quantity } of items) {
        const [product] = await tx`
          SELECT id, name, price, stock_quantity, shop_id, status
          FROM products
          WHERE id = ${productId}
          FOR UPDATE
        `;

        if (!product) {
          throw new Error("Produit introuvable.");
        }
        if (product.status && product.status !== "active") {
          throw new Error(`"${product.name}" n'est plus disponible.`);
        }
        if (product.stock_quantity < quantity) {
          throw new Error(`Stock insuffisant pour "${product.name}".`);
        }

        subtotal += Number(product.price) * quantity;
        resolvedItems.push({ product, quantity });
      }

      // 🚚 Frais livraison RECALCULÉS côté serveur (anti-fraude)
      const city = detectCityFromAddress(finalAddress);
      const deliveryFee = getDeliveryFee(city, subtotal, deliveryMethod);
      const totalWithDelivery = subtotal + deliveryFee;

      // 🎁 VALIDATION CODE PROMO (revalidation serveur = sécurité)
      // Règle financière v1 : la remise est supportée par Kimoxa (coût marketing).
      // Les vendeurs et commissions restent calculés sur le sous-total produits.
      let discountAmount = 0;
      let promoCodeId = null;
      if (promoCode) {
        const [promo] = await tx`
          SELECT * FROM promo_codes
          WHERE code = ${promoCode} AND active = true
          FOR UPDATE
        `;
        if (!promo) throw new Error("Code promo invalide ou désactivé.");
        if (promo.valid_from && new Date(promo.valid_from) > new Date()) throw new Error("Code pas encore actif.");
        if (promo.valid_until && new Date(promo.valid_until) < new Date()) throw new Error("Code expiré.");
        if (promo.usage_limit && promo.usage_count >= promo.usage_limit) throw new Error("Code épuisé.");
        if (subtotal < Number(promo.min_order_amount)) {
          throw new Error(`Montant minimum : ${Number(promo.min_order_amount).toLocaleString("fr-FR")} FCFA.`);
        }

        let d = promo.type === "percentage" ? subtotal * (Number(promo.value) / 100) : Number(promo.value);
        if (promo.type === "percentage" && promo.max_discount) d = Math.min(d, Number(promo.max_discount));
        discountAmount = Math.min(Math.round(d), subtotal); // jamais négatif, jamais > sous-total
        promoCodeId = promo.id;
      }

      const finalTotal = Math.max(0, totalWithDelivery - discountAmount);

      // 💰 QUI LIVRE ? (règle de répartition de l'argent de livraison)
      // - boutique seule ET elle livre elle-même → l'argent part à la boutique
      // - sinon (multi-boutiques ou non) → l'argent part au livreur Kimoxa
      let fulfilledBy = "kimoxa";
      if (deliveryMethod === "delivery" && deliveryFee > 0) {
        const shopIds = [...new Set(resolvedItems.map((r) => r.product.shop_id))];
        if (shopIds.length === 1) {
          const [shopRow] = await tx`
            SELECT delivers_own_orders FROM shops WHERE id = ${shopIds[0]}
          `;
          if (shopRow && shopRow.delivers_own_orders) fulfilledBy = "shop";
        }
      }

      const [newOrder] = await tx`
        INSERT INTO orders (buyer_id, status, total, shipping_address, phone,
                            payment_method, delivery_fee, delivery_method, fulfilled_by, expires_at,
                            promo_code, discount_amount)
        VALUES (${userId}, 'pending', ${finalTotal}, ${finalAddress}, ${phone},
                ${finalPaymentMethod}, ${deliveryFee}, ${deliveryMethod}, ${fulfilledBy},
                NOW() + INTERVAL '24 hours',
                ${promoCode}, ${discountAmount})
        RETURNING id, status, total, payment_method, delivery_fee, delivery_method, created_at
      `;

      const subtotalsByShop = {};

      for (const { product, quantity } of resolvedItems) {
        await tx`
          INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase)
          VALUES (${newOrder.id}, ${product.id}, ${quantity}, ${product.price})
        `;

        const [updated] = await tx`
          UPDATE products
          SET stock_quantity = stock_quantity - ${quantity}, updated_at = NOW()
          WHERE id = ${product.id} AND stock_quantity >= ${quantity}
          RETURNING id
        `;
        if (!updated) {
          throw new Error(`Stock insuffisant pour "${product.name}" (concurrent).`);
        }

        await tx`
          INSERT INTO stock_movements (product_id, type, quantity, reason, created_by)
          VALUES (${product.id}, 'sale', ${-quantity}, ${"Vente - commande #" + newOrder.id}, ${userId})
        `;

        const lineTotal = Number(product.price) * quantity;
        subtotalsByShop[product.shop_id] = (subtotalsByShop[product.shop_id] || 0) + lineTotal;
      }

      // 💰 Commission 9% PRODUITS UNIQUEMENT (jamais sur la livraison)
      for (const [shopId, shopSubtotal] of Object.entries(subtotalsByShop)) {
        const commissionAmount = Math.round(shopSubtotal * COMMISSION_RATE);
        // Si la boutique livre elle-même : la livraison s'ajoute à son payout (0% commission)
        const deliveryFeeForShop = fulfilledBy === "shop" ? deliveryFee : 0;
        const payoutAmount = shopSubtotal - commissionAmount + deliveryFeeForShop;

        await tx`
          INSERT INTO shop_commission_ledger
            (shop_id, order_id, commission_amount, gross_amount, status,
             commission_rate, payout_amount, payout_status, delivery_fee_amount)
          VALUES (${shopId}, ${newOrder.id}, ${commissionAmount}, ${shopSubtotal}, 'due',
                  9.0, ${payoutAmount}, 'held', ${deliveryFeeForShop})
        `;
      }

      // 🛵 Si c'est un livreur Kimoxa : l'argent de livraison est tracé à part
      if (deliveryMethod === "delivery" && deliveryFee > 0 && fulfilledBy === "kimoxa") {
        await tx`
          INSERT INTO courier_payouts (order_id, amount, status)
          VALUES (${newOrder.id}, ${deliveryFee}, 'due')
        `;
      }

      // 🎁 Incrémenter le compteur d'utilisations du code promo
      if (promoCodeId) {
        await tx`
          UPDATE promo_codes SET usage_count = usage_count + 1 WHERE id = ${promoCodeId}
        `;
      }

      return newOrder;
    });

    return Response.json({ order }, { status: 201 });
  } catch (err) {
    console.error("[orders POST]", err);
    return Response.json(
      { error: err.message && err.message.includes("Code") ? err.message : "Impossible de finaliser la commande." },
      { status: 400 }
    );
  }
}

export async function GET(request) {
  const userId = request.headers.get("x-user-id");

  // 🆕 Expiration lazy : annule les commandes expirées avant de lister
  const { cancelExpiredOrders } = await import("@/lib/queries/cancelExpiredOrders");
  await cancelExpiredOrders();

  const { getBuyerOrders } = await import("@/lib/queries/orders");
  const orders = await getBuyerOrders(userId);
  return Response.json({ orders });
}