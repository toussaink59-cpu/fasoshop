import { getFavoriteProducts } from "@/lib/queries/favorites";

// GET /api/favorites
// Liste les produits favoris de l'utilisateur connecté.
export async function GET(request) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return Response.json({ error: "Connexion requise." }, { status: 401 });
  }

  const products = await getFavoriteProducts(userId);
  return Response.json({ products });
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
