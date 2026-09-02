import { sendLowStockAlert } from "@/lib/email";
import sql from "@/lib/db";
import { clientKey } from "@/lib/rate-limit";

// PATCH /api/vendor/stock/:productId
// P1-05 (audit) : atomicite complete - transaction + FOR UPDATE + re-check stock
export async function PATCH(request, { params }) {
  const userId = request.headers.get("x-user-id");
  const { productId } = await params;

  try {
    const body = await request.json();
    const { adjustment, reason, compareAtPrice, flashSaleEndsAt } = body;

    // Validation stricte des types
    if (adjustment !== undefined) {
      if (!Number.isFinite(Number(adjustment)) || !Number.isInteger(Number(adjustment))) {
        return Response.json({ error: "L'ajustement doit etre un entier." }, { status: 400 });
      }
    }
    if (compareAtPrice !== undefined && compareAtPrice !== null) {
      if (!Number.isFinite(Number(compareAtPrice)) || Number(compareAtPrice) < 0) {
        return Response.json({ error: "Le prix barre doit etre un nombre positif ou null." }, { status: 400 });
      }
    }
    if (flashSaleEndsAt !== undefined && flashSaleEndsAt !== null) {
      const d = new Date(flashSaleEndsAt);
      if (isNaN(d.getTime())) {
        return Response.json({ error: "Date de fin de vente flash invalide." }, { status: 400 });
      }
    }

    const hasStockChange = adjustment !== undefined && Number(adjustment) !== 0;
    const hasPriceChange = Object.prototype.hasOwnProperty.call(body, "compareAtPrice");
    const hasFlashSaleChange = Object.prototype.hasOwnProperty.call(body, "flashSaleEndsAt");

    if (!hasStockChange && !hasPriceChange && !hasFlashSaleChange) {
      return Response.json({ error: "Aucune modification fournie." }, { status: 400 });
    }

    // P1-05 : TOUT dans une transaction + FOR UPDATE sur le produit
    const result = await sql.begin(async (tx) => {
      const [product] = await tx`
        SELECT p.id, p.name, p.price, p.stock_quantity, p.low_stock_threshold,
               s.vendor_id, s.name AS shop_name,
               u.email AS vendor_email, u.full_name AS vendor_name
        FROM products p
        JOIN shops s ON s.id = p.shop_id
        JOIN users u ON u.id = s.vendor_id
        WHERE p.id = ${productId}
        FOR UPDATE
      `;

      if (!product) throw Object.assign(new Error("Produit introuvable."), { code: "not_found" });
      if (String(product.vendor_id) !== String(userId)) {
        throw Object.assign(new Error("Ce produit n'appartient pas a votre boutique."), { code: "forbidden" });
      }

      if (hasPriceChange && compareAtPrice !== null && Number(compareAtPrice) <= Number(product.price)) {
        throw Object.assign(new Error("Le prix barre doit etre superieur au prix de vente actuel."), { code: "bad_price" });
      }

      if (hasFlashSaleChange && flashSaleEndsAt !== null) {
        const endsAt = new Date(flashSaleEndsAt);
        if (isNaN(endsAt.getTime()) || endsAt <= new Date()) {
          throw Object.assign(new Error("La date de fin de vente flash doit etre dans le futur."), { code: "bad_flash" });
        }
      }

      let newQuantity = product.stock_quantity;
      if (hasStockChange) {
        newQuantity = product.stock_quantity + Number(adjustment);
        if (newQuantity < 0) {
          throw Object.assign(new Error("Le stock ne peut pas etre negatif."), { code: "negative_stock" });
        }
      }

      const newCompareAtPrice = hasPriceChange ? compareAtPrice : undefined;
      const newFlashSaleEndsAt = hasFlashSaleChange ? flashSaleEndsAt : undefined;
      const newFlashSaleSnapshot = hasFlashSaleChange
        ? (flashSaleEndsAt === null ? null : newQuantity)
        : undefined;

      const [upd] = await tx`
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

      await tx`
        INSERT INTO security_audit_log (user_id, action, resource_type, resource_id, ip_address)
        VALUES (${userId}, 'update_product', 'product', ${productId}, ${clientKey(request)})
      `.catch(() => {});

      if (hasStockChange) {
        await tx`
          INSERT INTO stock_movements (product_id, type, quantity, reason, created_by)
          VALUES (${productId}, 'adjustment', ${Number(adjustment)}, ${reason || "Ajustement manuel"}, ${userId})
        `;
      }

      return { upd, product, newQuantity };
    });

    if (hasStockChange) {
      sendLowStockAlert({
        product: { name: result.product.name, low_stock_threshold: result.product.low_stock_threshold },
        vendor: { email: result.product.vendor_email, name: result.product.vendor_name, shopName: result.product.shop_name },
        oldStock: result.product.stock_quantity,
        newStock: result.newQuantity,
      }).catch(e => console.error("[lowStock] Envoi echoue:", e));
    }

    return Response.json({ product: result.upd });
  } catch (err) {
    console.error("Erreur mise a jour produit:", err?.message || err);
    if (err?.code === "not_found") return Response.json({ error: "Produit introuvable." }, { status: 404 });
    if (err?.code === "forbidden") return Response.json({ error: "Ce produit n'appartient pas a votre boutique." }, { status: 403 });
    if (err?.code === "bad_price") return Response.json({ error: "Le prix barre doit etre superieur au prix de vente actuel." }, { status: 400 });
    if (err?.code === "bad_flash") return Response.json({ error: "La date de fin de vente flash doit etre dans le futur." }, { status: 400 });
    if (err?.code === "negative_stock") return Response.json({ error: "Le stock ne peut pas etre negatif." }, { status: 400 });
    return Response.json({ error: "Erreur serveur lors de la mise a jour du produit." }, { status: 500 });
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
 // Anti-arnaque : tracer les tentatives de suppression d'un produit vendu
      await sql`
        INSERT INTO security_audit_log (user_id, action, resource_type, resource_id, ip_address)
        VALUES (${userId}, 'delete_product_denied', 'product', ${productId}, ${clientKey(request)})
      `.catch(() => {});

      return Response.json(
        {
          error: "Ce produit a déjà été commandé au moins une fois et ne peut pas être supprimé définitivement, pour préserver l'historique des commandes. Vous pouvez en revanche mettre son stock à 0 pour qu'il ne soit plus disponible à l'achat.",
        },
        { status: 409 }
      );
    }

 // Audit log de la suppression produit
    await sql`
      INSERT INTO security_audit_log (user_id, action, resource_type, resource_id, ip_address)
      VALUES (${userId}, 'delete_product', 'product', ${productId}, ${clientKey(request)})
    `.catch(() => {});

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

