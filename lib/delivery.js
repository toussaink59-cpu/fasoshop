// ===== RÈGLES DE LIVRAISON KIMOXA =====
// Ouagadougou : 1 500 FCFA · Autres villes : 2 500 FCFA
// GRATUIT dès 200 000 FCFA d'achats (partout).

export const FREE_DELIVERY_THRESHOLD = 200000;
export const DELIVERY_FEE_OUAGADOUGOU = 1500;
export const DELIVERY_FEE_AUTRES = 2500;

// Calcule les frais selon la ville de livraison et le sous-total (produits).
export function getDeliveryFee(city, subtotal) {
  const amount = Number(subtotal) || 0;
  if (amount >= FREE_DELIVERY_THRESHOLD) return 0;

  const normalized = (city || "").trim().toLowerCase();
  const isOuagadougou = normalized.startsWith("ouaga");
  return isOuagadougou ? DELIVERY_FEE_OUAGADOUGOU : DELIVERY_FEE_AUTRES;
}

// Libellé prêt à afficher : "1 500 FCFA", "2 500 FCFA" ou "Gratuite "
export function formatDeliveryFee(fee) {
  if (fee === 0) return "Gratuite 🎉";
  return `${Number(fee).toLocaleString("fr-FR")} FCFA`;
}

// Message "plus que X pour la livraison gratuite" (style Temu)
export function freeDeliveryHint(subtotal) {
  const amount = Number(subtotal) || 0;
  if (amount >= FREE_DELIVERY_THRESHOLD) return null;
  const remaining = FREE_DELIVERY_THRESHOLD - amount;
  return `Plus que ${remaining.toLocaleString("fr-FR")} FCFA pour la livraison GRATUITE !`;
}