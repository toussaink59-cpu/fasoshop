/**
 * Données structurées Schema.org (JSON-LD) pour le SEO :
 * prix, disponibilité, avis, livraison et retours
 * directement dans les résultats Google (rich snippets).
 */

function safeJsonLd(data) {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

export function productJsonLd(product, url) {
  const deliveryFee = Number(product.delivery_fee) || 0;
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description:
      product.description ||
      `${product.name} — disponible sur Kimoxa, la marketplace multi-vendeurs du Burkina Faso.`,
    image: Array.isArray(product.images) && product.images.length > 0 ? product.images : undefined,
    sku: product.sku || undefined,
    url,
    brand: product.shop_name ? { "@type": "Brand", name: product.shop_name } : undefined,
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "XOF",
      price: Number(product.price),
      availability:
        Number(product.stock_quantity) > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition:
        product.condition === "occasion"
          ? "https://schema.org/UsedCondition"
          : "https://schema.org/NewCondition",
      seller: product.shop_name ? { "@type": "Organization", name: product.shop_name } : undefined,
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: { "@type": "MonetaryAmount", value: deliveryFee, currency: "XOF" },
        shippingDestination: { "@type": "DefinedRegion", addressCountry: "BF" },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          transitTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 7, unitCode: "DAY" },
        },
      },
    },
    hasMerchantReturnPolicy: {
      "@type": "MerchantReturnPolicy",
      applicableCountry: "BF",
      returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
      merchantReturnDays: 7,
      returnMethod: "https://schema.org/ReturnInStore",
      refundType: "https://schema.org/FullRefund",
    },
    aggregateRating:
      product.review_count > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: Number(product.avg_rating).toFixed(1),
            reviewCount: product.review_count,
          }
        : undefined,
  };
  return safeJsonLd(data);
}

export function storeJsonLd(shop, url) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: shop.name,
    description: shop.description || undefined,
    url,
    address: shop.city
      ? { "@type": "PostalAddress", addressLocality: shop.city, addressCountry: "BF" }
      : undefined,
  };
  return safeJsonLd(data);
}
