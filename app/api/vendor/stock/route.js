import sql from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/rate-limit";

const ALLOWED_CONDITIONS = ["neuf", "quasi_neuf", "occasion"];
const MAX_PRICE = 100_000_000; // 100 millions FCFA max (limite raisonnable)
const MAX_STOCK = 100_000;     // 100 000 unités max
const MAX_NAME_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_BRAND_LENGTH = 100;
const MAX_IMAGES = 10;

// Sanitization : supprime caractères dangereux
function sanitize(str, maxLength = 200) {
  if (typeof str !== "string") return "";
  return str
    .replace(/[<>"'`$\\]/g, "")           // XSS/SQL injection
    .replace(/--/g, "")                  // SQL comments
    .replace(/\b(drop|select|insert|update|delete|union|exec|script)\b/gi, "")
    .trim()
    .slice(0, maxLength);
}

// Validation URL image
function isValidImageUrl(url) {
  if (typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && /\.(jpg|jpeg|png|webp|gif)$/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

// GET /api/vendor/stock — vendeur voit SEULEMENT ses produits
export async function GET(request) {
  const userId = request.headers.get("x-user-id");
  
  // Vérification de rôle en DB (défense en profondeur)
  const check = await requireRole(userId, ["vendor", "admin"]);
  if (!check.ok) {
    return Response.json({ error: check.error }, { status: check.status });
  }

  const products = await sql`
    SELECT p.id, p.name, p.sku, p.price, p.compare_at_price, p.stock_quantity, p.low_stock_threshold,
           p.flash_sale_ends_at, p.flash_sale_stock_snapshot, p.condition, p.brand,
           p.is_sponsored, p.sponsored_until,
           p.status, p.updated_at, s.name AS shop_name,
           c.name AS category_name, c.id AS category_id,
           p.images
    FROM products p
    JOIN shops s ON s.id = p.shop_id
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE s.vendor_id = ${userId}
    ORDER BY p.updated_at DESC
  `;

  return Response.json({ products });
}

// POST /api/vendor/stock — création produit avec validation militaire
export async function POST(request) {
  const userId = request.headers.get("x-user-id");
  
 // 1) Vérification de rôle en DB (défense en profondeur)
  const check = await requireRole(userId, ["vendor", "admin"]);
  if (!check.ok) {
    return Response.json({ error: check.error }, { status: check.status });
  }

 // 2) Rate limit : max 5 produits par minute
  const key = `product:${clientKey(request)}`;
  if (!(await rateLimit(key, { limit: 5, windowMs: 60_000 }))) {
    return Response.json(
      { error: "Trop de créations. Réessayez dans une minute." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();

 // 3) Validation stricte des champs
    const name = sanitize(body.name, MAX_NAME_LENGTH);
    const description = sanitize(body.description, MAX_DESCRIPTION_LENGTH);
    const brand = sanitize(body.brand, MAX_BRAND_LENGTH);
    const sku = sanitize(body.sku, 50);

    const price = Number(body.price);
    const compareAtPrice = body.compareAtPrice ? Number(body.compareAtPrice) : null;
    const stockQuantity = Number(body.stockQuantity) || 0;
    const lowStockThreshold = Number(body.lowStockThreshold) || 5;
    const categoryId = body.categoryId ? Number(body.categoryId) : null;
    const condition = ALLOWED_CONDITIONS.includes(body.condition) ? body.condition : "neuf";

    // Validation prix
    if (!name || name.length < 3) {
      return Response.json({ error: "Nom invalide." }, { status: 400 });
    }
    if (!Number.isFinite(price) || price <= 0 || price > MAX_PRICE) {
      return Response.json({ error: "Prix invalide." }, { status: 400 });
    }

    // Validation stock
    if (!Number.isInteger(stockQuantity) || stockQuantity < 0 || stockQuantity > MAX_STOCK) {
      return Response.json({ error: "Stock invalide." }, { status: 400 });
    }
    if (!Number.isInteger(lowStockThreshold) || lowStockThreshold < 0 || lowStockThreshold > MAX_STOCK) {
      return Response.json({ error: "Seuil de stock invalide." }, { status: 400 });
    }

    // Validation prix barré
    if (compareAtPrice !== null) {
      if (!Number.isFinite(compareAtPrice) || compareAtPrice <= price || compareAtPrice > MAX_PRICE) {
        return Response.json({ error: "Prix barré invalide." }, { status: 400 });
      }
    }

 // 4) Validation images (URLs HTTPS, max 10)
    let images = [];
    if (Array.isArray(body.images)) {
      images = body.images.slice(0, MAX_IMAGES).filter(isValidImageUrl);
    }

 // 5) Vérification boutique (doit appartenir au vendeur + active)
    const [shop] = await sql`
      SELECT id, status FROM shops WHERE vendor_id = ${userId} LIMIT 1
    `;

    if (!shop || shop.status !== "active") {
      return Response.json({ error: "Accès refusé." }, { status: 403 });
    }

 // 6) Validation categoryId (doit exister si fourni)
    if (categoryId !== null) {
      const [category] = await sql`
        SELECT id FROM categories WHERE id = ${categoryId}
      `;
      if (!category) {
        return Response.json({ error: "Catégorie invalide." }, { status: 400 });
      }
    }

 // 7) Création produit (transaction pour cohérence)
    const product = await sql.begin(async (tx) => {
      const [newProduct] = await tx`
        INSERT INTO products (shop_id, name, description, price, compare_at_price, sku, 
                              stock_quantity, low_stock_threshold, category_id, images, 
                              condition, brand, status)
        VALUES (${shop.id}, ${name}, ${description || null}, ${price}, ${compareAtPrice}, 
                ${sku || null}, ${stockQuantity}, ${lowStockThreshold}, ${categoryId}, 
                ${JSON.stringify(images)}, ${condition}, ${brand || null}, 'active')
        RETURNING id, name, price, stock_quantity, images, condition, brand
      `;

      if (stockQuantity > 0) {
        await tx`
          INSERT INTO stock_movements (product_id, type, quantity, reason, created_by)
          VALUES (${newProduct.id}, 'restock', ${stockQuantity}, 
                  'Stock initial à la création du produit', ${userId})
        `;
      }

 // 8) Audit log (traçabilité)
      await tx`
        INSERT INTO security_audit_log (user_id, action, resource_type, resource_id, ip_address)
        VALUES (${userId}, 'create_product', 'product', ${newProduct.id}, 
                ${clientKey(request)})
      `.catch(() => {}); // non bloquant si table n'existe pas encore

      return newProduct;
    });

    return Response.json({ product }, { status: 201 });
  } catch (err) {
    console.error("[vendor/stock POST]", err.message);
    return Response.json({ error: "Impossible de créer le produit." }, { status: 500 });
  }
}
