import sql from "@/lib/db";

// PATCH /api/vendor/stock/:productId
// Met à jour le stock, le prix barré et/ou la vente flash d'un produit —
// vérifie que ce produit appartient bien au vendeur connecté.
// body: { adjustment?, reason?, compareAtPrice?, flashSaleEndsAt? }
// - adjustment : positif (réappro) ou négatif (retrait) sur le stock
// - compareAtPrice : nouveau prix barré (envoyer null pour le retirer)
// - flashSaleEndsAt : date ISO de fin de vente flash (envoyer null pour désactiver)
export async function PATCH(request, { params }) {
  const userId = request.headers.get("x-user-id");
  const { productId } = await params;

  try {
    const body = await request.json();
    const { adjustment, reason, compareAtPrice, flashSaleEndsAt } = body;

    const hasStockChange = adjustment !== undefined && Number(adjustment) !== 0;
    const hasPriceChange = Object.prototype.hasOwnProperty.call(body, "compareAtPrice");
    const hasFlashSaleChange = Object.prototype.hasOwnProperty.call(body, "flashSaleEndsAt");

    if (!hasStockChange && !hasPriceChange && !hasFlashSaleChange) {
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

    if (hasFlashSaleChange && flashSaleEndsAt !== null) {
      const endsAt = new Date(flashSaleEndsAt);
      if (isNaN(endsAt.getTime()) || endsAt <= new Date()) {
        return Response.json(
          { error: "La date de fin de vente flash doit être dans le futur." },
          { status: 400 }
        );
      }
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
    // À l'activation d'une vente flash, on capture le stock actuel comme référence
    // pour la barre "X articles restants". À la désactivation, on l'efface aussi.
    const newFlashSaleEndsAt = hasFlashSaleChange ? flashSaleEndsAt : undefined;
    const newFlashSaleSnapshot = hasFlashSaleChange
      ? (flashSaleEndsAt === null ? null : newQuantity)
      : undefined;

    const [updated] = await sql`
      UPDATE products
      SET
        stock_quantity = ${newQuantity},
        compare_at_price = ${hasPriceChange ? newCompareAtPrice : sql`compare_at_price`},
        flash_sale_ends_at = ${hasFlashSaleChange ? newFlashSaleEndsAt : sql`flash_sale_ends_at`},
        flash_sale_stock_snapshot = ${hasFlashSaleChange ? newFlashSaleSnapshot : sql`flash_sale_stock_snapshot`},
        updated_at = NOW()
      WHERE id = ${productId}
      RETURNING id, name, stock_quantity, price, compare_at_price, flash_sale_ends_at, flash_sale_stock_snapshot
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

// DELETE /api/vendor/stock/:productId
// Supprime définitivement un produit du vendeur connecté. Refusé si le
// produit a déjà été commandé au moins une fois (pour ne pas corrompre
// l'historique des commandes) — dans ce cas, on suggère de le désactiver.
export async function DELETE(request, { params }) {
  const userId = request.headers.get("x-user-id");
  const { productId } = await params;

  try {
    const [product] = await sql`
      SELECT p.id, p.name, s.vendor_id
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

    const [{ count: orderCount }] = await sql`
      SELECT COUNT(*)::int AS count FROM order_items WHERE product_id = ${productId}
    `;

    if (orderCount > 0) {
      return Response.json(
        {
          error: "Ce produit a déjà été commandé au moins une fois et ne peut pas être supprimé définitivement, pour préserver l'historique des commandes. Vous pouvez en revanche mettre son stock à 0 pour qu'il ne soit plus disponible à l'achat.",
        },
        { status: 409 }
      );
    }

    // Aucun historique de commande : suppression définitive possible.
    await sql`DELETE FROM stock_movements WHERE product_id = ${productId}`;
    await sql`DELETE FROM reviews WHERE product_id = ${productId}`;
    await sql`DELETE FROM products WHERE id = ${productId}`;

    return Response.json({ success: true, deletedId: Number(productId), name: product.name });
  } catch (err) {
    console.error("Erreur suppression produit:", err);
    return Response.json(
      { error: "Erreur serveur lors de la suppression du produit." },
      { status: 500 }
    );
  }
}
