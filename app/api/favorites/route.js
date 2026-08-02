import sql from "@/lib/db";

// GET /api/favorites
// Liste les produits favoris de l'utilisateur connecté.
export async function GET(request) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return Response.json({ error: "Connexion requise." }, { status: 401 });
  }

  const products = await sql`
    SELECT p.id, p.name, p.price, p.compare_at_price, p.images, p.condition,
           s.name AS shop_name,
           COALESCE(r.avg_rating, 0) AS avg_rating, COALESCE(r.review_count, 0) AS review_count
    FROM favorites f
    JOIN products p ON p.id = f.product_id
    JOIN shops s ON s.id = p.shop_id
    LEFT JOIN (
      SELECT product_id, AVG(rating)::numeric(2,1) AS avg_rating, COUNT(*)::int AS review_count
      FROM reviews GROUP BY product_id
    ) r ON r.product_id = p.id
    WHERE f.user_id = ${userId}
    ORDER BY f.created_at DESC
  `;

  const parsed = products.map((p) => ({
    ...p,
    images: typeof p.images === "string" ? JSON.parse(p.images) : p.images,
  }));

  return Response.json({ products: parsed });
}

// POST /api/favorites
// Ajoute un produit aux favoris de l'utilisateur connecté.
// body: { productId }
export async function POST(request) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return Response.json({ error: "Connexion requise." }, { status: 401 });
  }

  try {
    const { productId } = await request.json();
    if (!productId) {
      return Response.json({ error: "productId requis." }, { status: 400 });
    }

    await sql`
      INSERT INTO favorites (user_id, product_id)
      VALUES (${userId}, ${productId})
      ON CONFLICT (user_id, product_id) DO NOTHING
    `;

    return Response.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("Erreur ajout favori:", err);
    return Response.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
