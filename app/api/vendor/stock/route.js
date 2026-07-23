import sql from "@/lib/db";

// GET /api/vendor/stock
export async function GET(request) {
  const userId = request.headers.get("x-user-id");

  const products = await sql`
    SELECT p.id, p.name, p.sku, p.price, p.compare_at_price, p.stock_quantity, p.low_stock_threshold,
           p.flash_sale_ends_at, p.flash_sale_stock_snapshot,
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
export async function POST(request) {
  const userId = request.headers.get("x-user-id");

  try {
    const body = await request.json();
    const { name, description, price, compareAtPrice, sku, stockQuantity, lowStockThreshold, categoryId, images } = body;
    if (!name || price === undefined) {
      return Response.json(
        { error: "Le nom et le prix du produit sont requis." },
        { status: 400 }
      );
    }

    if (compareAtPrice && Number(compareAtPrice) <= Number(price)) {
      return Response.json(
        { error: "Le prix barré doit être supérieur au prix de vente." },
        { status: 400 }
      );
    }

    const [shop] = await sql`
      SELECT id FROM shops WHERE vendor_id = ${userId} LIMIT 1
    `;
    if (!shop) {
      return Response.json(
        { error: "Aucune boutique associée à ce compte vendeur." },
        { status: 404 }
      );
    }

    const initialStock = Number(stockQuantity) || 0;

    const [product] = await sql`
      INSERT INTO products (shop_id, name, description, price, compare_at_price, sku, stock_quantity, low_stock_threshold, category_id, images)
      VALUES (${shop.id}, ${name}, ${description || null}, ${price}, ${compareAtPrice || null}, ${sku || null}, ${initialStock}, ${lowStockThreshold || 5}, ${categoryId || null}, ${JSON.stringify(images || [])})
      RETURNING id, name, price, stock_quantity, images
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
