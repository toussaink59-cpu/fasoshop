import sql from "@/lib/db";

const ALLOWED_CONDITIONS = ["neuf", "quasi_neuf", "occasion"];

// GET /api/vendor/stock
export async function GET(request) {
  const userId = request.headers.get("x-user-id");

  const products = await sql`
    SELECT p.id, p.name, p.sku, p.price, p.compare_at_price, p.stock_quantity, p.low_stock_threshold,
           p.flash_sale_ends_at, p.flash_sale_stock_snapshot, p.condition,
           p.status, p.updated_at, s.name AS shop_name,
           c.name AS category_name, c.id AS category_id
    FROM products p
    JOIN shops s ON s.id = p.shop_id
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE s.vendor_id = ${userId}
    ORDER BY p.updated_at DESC
  `;

  return Response.json({ products });
}

// POST /api/vendor/stock
// body: { name, description?, price, compareAtPrice?, sku?, stockQuantity, lowStockThreshold?, categoryId? }
// La boutique doit être vérifiée (status = 'active') pour pouvoir publier des produits.
export async function POST(request) {
  const userId = request.headers.get("x-user-id");

  try {
    const body = await request.json();
    const { name, description, price, compareAtPrice, sku, stockQuantity, lowStockThreshold, categoryId, images, condition } = body;
    if (!name || price === undefined) {
      return Response.json(
        { error: "Le nom et le prix du produit sont requis." },
        { status: 400 }
      );
    }

    const finalCondition = ALLOWED_CONDITIONS.includes(condition) ? condition : "neuf";

    if (compareAtPrice && Number(compareAtPrice) <= Number(price)) {
      return Response.json(
        { error: "Le prix barré doit être supérieur au prix de vente." },
        { status: 400 }
      );
    }

    const [shop] = await sql`
      SELECT id, status FROM shops WHERE vendor_id = ${userId} LIMIT 1
    `;
    if (!shop) {
      return Response.json(
        { error: "Aucune boutique associée à ce compte vendeur." },
        { status: 404 }
      );
    }

    if (shop.status !== "active") {
      const messages = {
        pending: "Votre boutique est en attente de vérification par notre équipe. Vous pourrez publier des produits une fois validée.",
        rejected: "Votre demande de compte vendeur n'a pas été validée. Corrigez vos informations depuis votre tableau de bord.",
        suspended: "Votre boutique est actuellement suspendue. Contactez le support pour plus d'informations.",
      };
      return Response.json(
        { error: messages[shop.status] || "Votre boutique n'est pas encore active." },
        { status: 403 }
      );
    }

    const initialStock = Number(stockQuantity) || 0;

    const [product] = await sql`
      INSERT INTO products (shop_id, name, description, price, compare_at_price, sku, stock_quantity, low_stock_threshold, category_id, images, condition)
      VALUES (${shop.id}, ${name}, ${description || null}, ${price}, ${compareAtPrice || null}, ${sku || null}, ${initialStock}, ${lowStockThreshold || 5}, ${categoryId || null}, ${JSON.stringify(images || [])}, ${finalCondition})
      RETURNING id, name, price, stock_quantity, images, condition
    `;

    if (initialStock > 0) {
      await sql`
        INSERT INTO stock_movements (product_id, type, quantity, reason, created_by)
        VALUES (${product.id}, 'restock', ${initialStock}, 'Stock initial à la création du produit', ${userId})
      `;
    }

    return Response.json({ product }, { status: 201 });
  } catch (err) {
    console.error("Erreur création produit:", err);
    return Response.json(
      { error: "Erreur serveur lors de la création du produit." },
      { status: 500 }
    );
  }
}
