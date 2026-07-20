// Affiche le prix d'un produit, avec prix barré et badge de réduction
// si compare_at_price est défini et supérieur au prix actuel.

export function hasDiscount(product) {
  return (
    product.compare_at_price &&
    Number(product.compare_at_price) > Number(product.price)
  );
}

export function discountPercent(product) {
  if (!hasDiscount(product)) return 0;
  const price = Number(product.price);
  const compareAt = Number(product.compare_at_price);
  return Math.round((1 - price / compareAt) * 100);
}

export default function PriceDisplay({ product }) {
  const discounted = hasDiscount(product);

  return (
    <div className="price-display">
      {discounted && (
        <span className="price-old">
          {Number(product.compare_at_price).toLocaleString("fr-FR")} FCFA
        </span>
      )}
      <span className="price-current">
        {Number(product.price).toLocaleString("fr-FR")} FCFA
      </span>
    </div>
  );
}
