import sql from "@/lib/db";

// GET /api/vendor/orders
// Liste les lignes de commande concernant les produits du vendeur connecté,
// avec les infos de livraison pour qu'il puisse préparer l'envoi.
export async function GET(request) {
  const userId = request.headers.get("x-user-id");

  const items = await sql`
    SELECT oi.id AS item_id, oi.quantity, oi.price_at_purchase,
           p.name AS product_name,
           o.id AS order_id, o.status, o.shipping_address, o.phone, o.payment_method, o.created_at
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    JOIN shops s ON s.id = p.shop_id
    JOIN orders o ON o.id = oi.order_id
    WHERE s.vendor_id = ${userId}
    ORDER BY o.created_at DESC
  `;

  return Response.json({ items });
}
