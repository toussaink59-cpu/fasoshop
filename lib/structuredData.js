/**
 * Génère des données structurées Schema.org (JSON-LD) pour le SEO :
 * permet à Google d'afficher prix, disponibilité et étoiles d'avis
 * directement dans les résultats de recherche (rich snippets).
 *
 * Voir : https://developers.google.com/search/docs/appearance/structured-data/product
 */

// Échappe les caractères qui pourraient fermer prématurément la balise
// <script> si jamais un nom/description contenait "</script>" ou "<!--".
// JSON.stringify() n'échappe pas "<" par défaut — sans ce filtre, un nom
// de produit malicieux pourrait injecter du HTML dans la page.
function safeJsonLd(data) {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

export function productJsonLd(product, url) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || undefined,
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
    },
    // Google exige au moins 1 avis pour accepter aggregateRating : on
    // omet totalement le champ plutôt que d'envoyer une fausse moyenne
    // à 0, ce qui serait pénalisé (donnée structurée trompeuse).
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
