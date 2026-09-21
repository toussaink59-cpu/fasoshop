function isValidPrice(value) {
  return (
    value !== null &&
    value !== undefined &&
    value !== "" &&
    Number.isFinite(Number(value))
  );
}

export function hasDiscount(product) {
  const price = product?.price;
  const compareAt = product?.compare_at_price;

  return (
    isValidPrice(price) &&
    isValidPrice(compareAt) &&
    Number(compareAt) > Number(price)
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
  const rawPrice = product?.price;
  const price = Number(rawPrice);
  const priceIsValid = isValidPrice(rawPrice);

  return (
    <div className="price-display">
      {discounted && (
        <span className="price-old">
          {Number(product.compare_at_price).toLocaleString("fr-FR")} FCFA
        </span>
      )}

      <span className="price-current">
        {priceIsValid
          ? `${price.toLocaleString("fr-FR")} FCFA`
          : "Prix indisponible"}
      </span>
    </div>
  );
}
