import sql from "@/lib/db";

// GET /api/products/[id]
export async function GET(request, { params }) {
  const { id } = await params;

  const [product] = await sql`
    SELECT p.id, p.name, p.description, p.price, p.compare_at_price, p.stock_quantity,
           p.sku, p.images, s.id AS shop_id, s.name AS shop_name,
           c.name AS category_name, c.slug AS category_slug
    FROM products p
    JOIN shops s ON s.id = p.shop_id
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.id = ${id} AND p.status = 'active' AND s.status = 'active'
  `;
if (product && typeof product.images === "string") {
    product.images = JSON.parse(product.images);
  }
  if (!product) {
    return Response.json({ error: "Produit introuvable." }, { status: 404 });
  }

  const [ratingStats] = await sql`
    SELECT COALESCE(AVG(rating), 0)::float AS avg_rating, COUNT(*)::int AS review_count
    FROM reviews WHERE product_id = ${id}
  `;

  return Response.json({
    product: { ...product, avg_rating: ratingStats.avg_rating, review_count: ratingStats.review_count },
  });
}