import sql from "@/lib/db";

// DELETE /api/favorites/[productId]
// Retire un produit des favoris de l'utilisateur connecté.
export async function DELETE(request, { params }) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return Response.json({ error: "Connexion requise." }, { status: 401 });
  }

  const { productId } = await params;

  await sql`
    DELETE FROM favorites WHERE user_id = ${userId} AND product_id = ${productId}
  `;

  return Response.json({ success: true });
}
