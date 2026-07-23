import sql from "@/lib/db";

// GET /api/products
// Catalogue public — uniquement les produits actifs et en stock.
// Filtre optionnel : ?category=slug (parent ou sous-catégorie)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const categorySlug = searchParams.get("category");

  let products;

  if (categorySlug) {
    // Si c'est une catégorie parente, on inclut aussi ses sous-catégories.
    // Si c'est déjà une sous-catégorie, on ne prend que celle-ci.
    products = await sql`
      SELECT p.id, p.name, p.description, p.price, p.compare_at_price, p.stock_quantity, p.images, s.name AS shop_name,
             c.name AS category_name, c.slug AS category_slug
      FROM products p
      JOIN shops s ON s.id = p.shop_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.status = 'active' AND s.status = 'active'
        AND p.category_id IN (
          SELECT id FROM categories
          WHERE slug = ${categorySlug}
             OR parent_id = (SELECT id FROM categories WHERE slug = ${categorySlug})
        )
      ORDER BY p.created_at DESC
    `;
  } else {
    products = await sql`
      SELECT p.id, p.name, p.description, p.price, p.compare_at_price, p.stock_quantity, p.images, s.name AS shop_name,
                   c.name AS category_name, c.slug AS category_slug
      FROM products p
      JOIN shops s ON s.id = p.shop_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.status = 'active' AND s.status = 'active'
      ORDER BY p.created_at DESC
    `;
  }
products = products.map((p) => ({
    ...p,
    images: typeof p.images === "string" ? JSON.parse(p.images) : p.images,
  }));
  return Response.json({ products });
}
