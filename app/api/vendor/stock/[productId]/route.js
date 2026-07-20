import sql from "@/lib/db";

// PATCH /api/vendor/stock/:productId
// Met à jour le stock et/ou le prix barré d'un produit — vérifie que ce produit
// appartient bien au vendeur connecté avant toute modification.
// body: { adjustment?, reason?, compareAtPrice? }
// - adjustment : positif (réappro) ou négatif (retrait) sur le stock
// - compareAtPrice : nouveau prix barré (envoyer null pour le retirer)
export async function PATCH(request, { params }) {
  const userId = request.headers.get("x-user-id");
  const { productId } = await params;

  try {
    const body = await request.json();
    const { adjustment, reason, compareAtPrice } = body;

    const hasStockChange = adjustment !== undefined && Number(adjustment) !== 0;
    const hasPriceChange = Object.prototype.hasOwnProperty.call(body, "compareAtPrice");

    if (!hasStockChange && !hasPriceChange) {
      return Response.json(
        { error: "Aucune modification fournie." },
        { status: 400 }
      );
    }

    // Vérifie que le produit appartient bien à ce vendeur
    const [product] = await sql`
      SELECT p.id, p.price, p.stock_quantity, s.vendor_id
      FROM products p
      JOIN shops s ON s.id = p.shop_id
      WHERE p.id = ${productId}
    `;

    if (!product) {
      return Response.json({ error: "Produit introuvable." }, { status: 404 });
    }
    if (String(product.vendor_id) !== String(userId)) {
      return Response.json(
        { error: "Ce produit n'appartient pas à votre boutique." },
        { status: 403 }
      );
    }

    if (hasPriceChange && compareAtPrice !== null && Number(compareAtPrice) <= Number(product.price)) {
      return Response.json(
        { error: "Le prix barré doit être supérieur au prix de vente actuel." },
        { status: 400 }
      );
    }

    let newQuantity = product.stock_quantity;
    if (hasStockChange) {
      newQuantity = product.stock_quantity + Number(adjustment);
      if (newQuantity < 0) {
        return Response.json(
          { error: "Le stock ne peut pas être négatif." },
          { status: 400 }
        );
      }
    }

    const newCompareAtPrice = hasPriceChange ? compareAtPrice : undefined;

    const [updated] = await sql`
      UPDATE products
      SET
        stock_quantity = ${newQuantity},
        compare_at_price = ${hasPriceChange ? newCompareAtPrice : sql`compare_at_price`},
        updated_at = NOW()
      WHERE id = ${productId}
      RETURNING id, name, stock_quantity, price, compare_at_price
    `;

    if (hasStockChange) {
      await sql`
        INSERT INTO stock_movements (product_id, type, quantity, reason, created_by)
        VALUES (${productId}, 'adjustment', ${Number(adjustment)}, ${reason || "Ajustement manuel"}, ${userId})
      `;
    }

    return Response.json({ product: updated });
  } catch (err) {
    console.error("Erreur mise à jour produit:", err);
    return Response.json(
      { error: "Erreur serveur lors de la mise à jour du produit." },
      { status: 500 }
    );
  }
}
