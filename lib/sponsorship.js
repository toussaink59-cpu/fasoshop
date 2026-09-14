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

// CORRECTION (2026-09-12) : garde anti-NaN.
// AVANT : Number(undefined) => NaN => "NaN FCFA" affiché (lignes
// historiques sans prix, ou champ manquant côté client).
// MAINTENANT : toute valeur non numérique affiche un tiret.
export function formatFcfa(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString("fr-FR") + " FCFA";
}