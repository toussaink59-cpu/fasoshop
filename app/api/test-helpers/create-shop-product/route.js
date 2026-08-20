import sql from "@/lib/db";

function guard() {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "Non disponible en production." }, { status: 403 });
  }
  if (process.env.ALLOW_TEST_HELPERS !== "1") {
    return Response.json({ error: "Test helpers desactives." }, { status: 403 });
  }
  return null;
}

export async function POST(request) {
  const g = guard();
  if (g) return g;
  try {
    const { vendorEmail, productName, price, stock } = await request.json();
    const [vendor] = await sql`SELECT id FROM users WHERE email = ${vendorEmail}`;
    if (!vendor) return Response.json({ error: "Vendor introuvable" }, { status: 404 });

    const [shop] = await sql`
      INSERT INTO shops (vendor_id, name, status, delivery_fee, offers_delivery, offers_pickup)
      VALUES (${vendor.id}, ${"Boutique Test " + vendor.id}, 'active', 1000, true, true)
      RETURNING id
    `;
    const [product] = await sql`
      INSERT INTO products (shop_id, name, price, stock_quantity, status)
      VALUES (${shop.id}, ${productName}, ${price}, ${stock}, 'active')
      RETURNING id
    `;
    return Response.json({ shopId: shop.id, productId: product.id });
  } catch (err) {
    console.error("[create-shop-product]", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
