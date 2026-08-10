import sql from "@/lib/db";
import { getDeliveryFee } from "@/lib/delivery";
import { rateLimit, clientKey } from "@/lib/rate-limit";

const COMMISSION_RATE = 0.055;

function detectCityFromAddress(address) {
  const addr = (address || "").toLowerCase();
  if (addr.includes("ouaga") || addr.includes("kadiogo")) return "Ouagadougou";
  return address ? "Autre" : "";
}

// 🔒 Sanitization : supprime caractères dangereux
function sanitizeAddress(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/[;<>$`\\]/g, "")           // injection SQL/JS
    .replace(/--/g, "")                  // commentaires SQL
    .replace(/\b(drop|select|insert|update|delete|union|exec)\b/gi, "")
    .trim()
    .slice(0, 300);                      // longueur max raisonnable
}

// 🔒 Validation téléphone : +226 XX XX XX XX ou international
function isValidPhone(phone) {
  return /^\+?[0-9\s\-()]{8,20}$/.test(phone);
}

// 🔒 Validation items
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

  // 🔒 1) Seul un acheteur peut commander (admin exclu par sécurité)
  if (!userId || userRole !== "buyer") {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }

  // 🔒 2) Rate limiting : max 5 commandes par minute par IP
  const key = `order:${clientKey(request)}`;
  if (!rateLimit(key, { limit: 5, windowMs: 60_000 })) {
    return Response.json(
      { error: "Trop de tentatives. Réessayez dans une minute." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();

    // 🔒 3) Validation stricte des entrées
    const items = validateItems(body.items);

    const shippingAddress = sanitizeAddress(body.shippingAddress);
    const phone = String(body.phone || "").trim();

    // ✅ CORRECTION : minimum 5 caractères (au lieu de 10)
    // pour accepter les adresses courtes type "Kaya, marché central"
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

      // 🔒 4) Verrou FOR UPDATE + vérification statut + stock atomique
      for (const { productId, quantity } of items) {
        const [product] = await tx`
          SELECT id, name, price, stock_quantity, shop_id, status
          FROM products
          WHERE id = ${productId}
          FOR UPDATE
        `;

        if (!product) {
          throw new Error(`Produit introuvable.`);
        }
        if (product.status !== "active") {
          throw new Error(`"${product.name}" n'est plus disponible.`);
        }
        if (product.stock_quantity < quantity) {
          throw new Error(`Stock insuffisant pour "${product.name}".`);
        }

        subtotal += Number(product.price) * quantity;
        resolvedItems.push({ product, quantity });
      }

      // 🔒 5) Frais livraison RECALCULÉS côté serveur (anti-fraude)
      const city = detectCityFromAddress(finalAddress);
      const deliveryFee = getDeliveryFee(city, subtotal, deliveryMethod);
      const totalWithDelivery = subtotal + deliveryFee;

      const [newOrder] = await tx`
        INSERT INTO orders (buyer_id, status, total, shipping_address, phone,
                            payment_method, delivery_fee, delivery_method)
        VALUES (${userId}, 'pending', ${totalWithDelivery}, ${finalAddress}, ${phone},
                ${finalPaymentMethod}, ${deliveryFee}, ${deliveryMethod})
        RETURNING id, status, total, payment_method, delivery_fee, delivery_method, created_at
      `;

      const subtotalsByShop = {};

      for (const { product, quantity } of resolvedItems) {
        await tx`
          INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase)
          VALUES (${newOrder.id}, ${product.id}, ${product.quantity}, ${product.price})
        `;

        // 🔒 6) Décrémentation avec vérification atomique (évite stock négatif)
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

      // 💰 Commission 5,5% par boutique (sur produits uniquement)
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
    console.error("[orders POST]", err.message);
    // 🔒 7) Message générique : ne révèle rien à l'attaquant
    return Response.json(
      { error: "Impossible de finaliser la commande." },
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
