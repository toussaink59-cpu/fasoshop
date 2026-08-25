// Tarification du sponsoring produit.
// Pour ajouter/modifier un pack : changer UNIQUEMENT ce fichier.
export const SPONSOR_PACKS = [
  { id: "1m", label: "1 mois", durationDays: 30, priceFcfa: 2000 },
  { id: "3m", label: "3 mois", durationDays: 90, priceFcfa: 5000 },
  { id: "6m", label: "6 mois", durationDays: 180, priceFcfa: 10000, popular: true },
  { id: "12m", label: "12 mois", durationDays: 365, priceFcfa: 18000, bestValue: true },
];

export function getSponsorPack(durationDays) {
  return SPONSOR_PACKS.find((p) => p.durationDays === Number(durationDays)) || null;
}

export function formatFcfa(n) {
  return Number(n).toLocaleString("fr-FR") + " FCFA";
}
