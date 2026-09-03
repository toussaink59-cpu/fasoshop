export const runtime = "nodejs";
import { sameOrigin } from "@/lib/csrf";
import { createNotification } from "@/lib/notifications";
import { sendMail, emailTemplates, sendLowStockAlert, sendNewOrderToVendor } from "@/lib/email";
import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { logger, generateRequestId } from "@/lib/logger";

const COMMISSION_RATE = (Number(process.env.COMMISSION_RATE_PERCENT) || 8) / 100;

export async function POST(request) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  if (!sameOrigin(request)) return Response.json({ error: "Origine non autorisée." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const { items, shippingAddress, phone, paymentMethod, deliveryMethod, promo_code } = body;

  // === Validation des entrées ===
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Panier vide" }, { status: 400 });
  }

  // ✅ P2-12 : limite anti-DoS sur le nombre d'items
  if (items.length > 50) {
    return NextResponse.json(
      { error: "Trop d'articles dans le panier (max 50)." },
      { status: 400 }
    );
  }

  if (deliveryMethod === "delivery" && (!shippingAddress || !shippingAddress.trim())) {
    return NextResponse.json({ error: "Adresse de livraison requise" }, { status: 400 });
  }

  if (!phone || !phone.trim()) {
    return NextResponse.json({ error: "Numéro de téléphone requis" }, { status: 400 });
  }

  if (!["cod", "mobile_money"].includes(paymentMethod)) {
    return NextResponse.json({ error: "Mode de paiement invalide" }, { status: 400 });
  }

  if (!["delivery", "pickup"].includes(deliveryMethod)) {
    return NextResponse.json({ error: "Mode de livraison invalide" }, { status: 400 });
  }

  // === CAST explicite des IDs (localStorage donne des strings) ===
  const productIds = items.map((i) => Number(i.productId)).filter((n) => Number.isInteger(n) && n > 0);

  if (productIds.length !== items.length) {
    return NextResponse.json({ error: "Produits invalides dans le panier" }, { status: 400 });
  }

  // === Validation stricte des quantites (entier > 0, max 99) ===
  for (const item of items) {
    const q = item.quantity;
    if (!Number.isInteger(q) || q < 1 || q > 99) {
      return NextResponse.json(
        { error: "Quantite invalide (doit etre un entier entre 1 et 99)." },
        { status: 400 }
      );
    }
  }

  // === Résolution des produits avec stock réel ===
  const products = await sql`
    SELECT p.id, p.price, p.stock_quantity, p.name, p.shop_id, p.status, p.low_stock_threshold,
           s.name AS shop_name, u.email AS vendor_email, u.full_name AS vendor_name
    FROM products p
    JOIN shops s ON s.id = p.shop_id
    JOIN users u ON u.id = s.vendor_id
    WHERE p.id = ANY(${productIds}::int[])
  `;

  const productsMap = Object.fromEntries(products.map((p) => [p.id, p]));

  // Vérif disponibilité + stock
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

  // Vérif : toutes les boutiques doivent être actives
  for (const s of shops) {
    if (s.status !== "active") {
      return NextResponse.json(
        { error: `Boutique "${s.name}" temporairement indisponible` },
        { status: 400 }
      );
    }
  }

  // Vérif : livraison à domicile vs options boutique
  if (deliveryMethod === "delivery") {
    for (const s of shops) {
      if (!s.offers_delivery) {
        return NextResponse.json(
          { error: `"${s.name}" ne propose pas la livraison à domicile. Choisissez le retrait.` },
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

  // === PROMO CODE : validation déplacée DANS la transaction (P1-07) ===
  let promoDiscount = 0;
  let validPromoCode = null;
  let finalTotal = grandTotal;

  // === Transaction atomique : commande + stock + ledger ===
  try {
    const stockChanges = [];
    const result = await sql.begin(async (tx) => {
      // P1-07 (audit) : validation promo DANS la transaction (anti-race)
      if (promo_code && String(promo_code).trim()) {
        const [promo] = await tx`
          SELECT * FROM promo_codes
          WHERE code = ${String(promo_code).toUpperCase()}
            AND active = true
            AND (expires_at IS NULL OR expires_at >= NOW())
            AND (max_uses IS NULL OR used_count < max_uses)
          FOR UPDATE
        `;
        if (promo) {
          const shopSubtotal = items.reduce((sum, it) => {
            const pp = productsMap[Number(it.productId)];
            return pp && Number(pp.shop_id) === Number(promo.shop_id) ? sum + Number(pp.price) * it.quantity : sum;
          }, 0);
          if (shopSubtotal >= (promo.min_amount || 0) && shopSubtotal > 0) {
            promoDiscount = promo.discount_type === "percent"
              ? Math.round(shopSubtotal * promo.discount_value / 100)
              : Math.min(promo.discount_value, shopSubtotal);
            validPromoCode = promo.code;
            finalTotal = Math.max(0, grandTotal - promoDiscount);
            await tx`UPDATE promo_codes SET used_count = used_count + 1 WHERE id = ${promo.id}`;
          }
        }
      }

      // 1. Création commande
      const [newOrder] = await tx`
        INSERT INTO orders (buyer_id, shipping_address, phone, payment_method,
                            total, subtotal, delivery_fee, status, delivery_method, promo_code, promo_discount)
        VALUES (${user.id}, ${shippingAddress || ""}, ${phone}, ${paymentMethod},
                ${finalTotal}, ${subtotalProducts}, ${deliveryFee}, 'pending', ${deliveryMethod}, ${validPromoCode}, ${promoDiscount})
        RETURNING id, total, subtotal, delivery_fee, status
      `;

      // 2. Items + déstockage
      const subtotalsByShop = {};
      for (const item of items) {
        const pid = Number(item.productId);
        const p = productsMap[pid];
        const lineTotal = Number(p.price) * item.quantity;

        await tx`
          INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase)
          VALUES (${newOrder.id}, ${p.id}, ${item.quantity}, ${Number(p.price)})
        `;

        const oldStock = p.stock_quantity;
        // P1-05 (audit) : verrouiller la ligne produit avant UPDATE
        const [locked] = await tx`
          SELECT id, stock_quantity FROM products WHERE id = ${p.id} FOR UPDATE
        `;
        if (!locked || locked.stock_quantity < item.quantity) {
          throw new Error(`Stock insuffisant pour "${p.name}" (concurrence)`);
        }
        const [upd] = await tx`
          UPDATE products
          SET stock_quantity = stock_quantity - ${item.quantity}
          WHERE id = ${p.id}
          RETURNING id
        `;
        if (!upd) {
          throw new Error(`Stock insuffisant pour "${p.name}" (concurrence)`);
        }
        const newStock = oldStock - item.quantity;
        p.stock_quantity = newStock;
        stockChanges.push({ product: p, oldStock, newStock });

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

    // Email de confirmation de commande (non bloquant)
    try {
      const tpl = emailTemplates.orderConfirmation({
        orderId: result.id,
        total: result.total,
        deliveryAddress: shippingAddress || "Retrait en boutique",
      });
      sendMail({ to: user.email, subject: tpl.subject, html: tpl.html })
        .catch(e => console.error("[orderConfirmation] envoi echoue:", e));
    } catch (e) {
      console.error("[orderConfirmation] preparation echouee:", e);
    }

    // NOTIF: new_order - notifier chaque vendeur concerné par cette commande
    try {
      const shopRows = await sql`
        SELECT p.shop_id, COALESCE(SUM(oi.quantity * oi.price_at_purchase), 0)::float AS shop_sub
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = ${result.id}
        GROUP BY p.shop_id
      `;
      for (const row of shopRows) {
        const [shopRow] = await sql`SELECT vendor_id, name FROM shops WHERE id = ${row.shop_id} LIMIT 1`;
        if (shopRow) {
          await createNotification({
            userId: shopRow.vendor_id,
            type: 'order_new',
            title: 'Nouvelle commande #' + result.id,
            body: Number(row.shop_sub).toLocaleString('fr-FR') + ' FCFA a preparer (' + shopRow.name + ')',
            link: '/vendor/orders',
            data: { orderId: result.id, shopId: row.shop_id },
          });
        }
      }
    } catch (notifErr) {
      console.error('[notif] new_order error:', notifErr.message);
    }

    // Notifications vendeurs : 1 email par boutique avec tous ses produits (non bloquant)
    try {
      const itemsByShop = {};
      for (const sc of stockChanges) {
        const shopId = sc.product.shop_id;
        if (!itemsByShop[shopId]) {
          itemsByShop[shopId] = {
            vendorEmail: sc.product.vendor_email,
            vendorName: sc.product.vendor_name,
            shopName: sc.product.shop_name,
            items: [],
            subtotal: 0,
          };
        }
        const qty = sc.oldStock - sc.newStock;
        const lineTotal = Number(sc.product.price) * qty;
        itemsByShop[shopId].items.push({
          name: sc.product.name,
          quantity: qty,
          price: Number(sc.product.price),
          lineTotal,
        });
        itemsByShop[shopId].subtotal += lineTotal;
      }

      Promise.all(
        Object.values(itemsByShop).map(shop =>
          sendNewOrderToVendor({
            vendorEmail: shop.vendorEmail,
            vendorName: shop.vendorName,
            shopName: shop.shopName,
            orderId: result.id,
            items: shop.items,
            subtotal: shop.subtotal,
            deliveryMethod,
            deliveryAddress: shippingAddress || null,
          })
        )
      ).catch(e => console.error("[newOrderToVendor] envoi echoue:", e));
    } catch (e) {
      console.error("[newOrderToVendor] preparation echouee:", e);
    }

    // Envoi asynchrone des alertes stock bas (post-commit, ne bloque pas la réponse)
    Promise.all(stockChanges.map(sc =>
      sendLowStockAlert({
        product: { name: sc.product.name, low_stock_threshold: sc.product.low_stock_threshold },
        vendor: { email: sc.product.vendor_email, name: sc.product.vendor_name, shopName: sc.product.shop_name },
        oldStock: sc.oldStock,
        newStock: sc.newStock,
      })
    )).catch(e => console.error("[lowStock] Envoi post-commande echoue:", e));

    logger.info("Order created", {
      route: "/api/orders",
      method: "POST",
      request_id: requestId,
      user_id: user.id,
      order_id: result.id,
      total: result.total,
      duration_ms: Date.now() - startTime,
    });
    return NextResponse.json({ order: result });
  } catch (err) {
    logger.error("Order creation failed", {
      route: "/api/orders",
      method: "POST",
      request_id: requestId,
      error: err.message,
      duration_ms: Date.now() - startTime,
    });
    return NextResponse.json(
      { error: "Erreur lors de la commande" },
      { status: 500 }
    );
  }
}