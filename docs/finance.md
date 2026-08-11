# KIMOXA — Modèle financier (document de référence)

> Statut : RÉFÉRENCE ABSOLUE. Tout code financier doit respecter ce document.
> Dernière mise à jour : 2026-08-11 (audit clos)

## 1. Acteurs et flux d'argent

| Acteur | Rôle financier |
|---|---|
| Acheteur (buyer) | Paie le total = produits + livraison |
| Vendeur (vendor) | Reçoit le prix de ses produits MINUS commission 5,5 % |
| Kimoxa (plateforme) | Encaisse la commission 5,5 % ; supporte les frais de paiement en ligne |
| Livreur | Reçoit 100 % des frais de livraison quand il livre |

## 2. Formule d'une commande

**Exemple** : produits 10 000 F, livraison 1 000 F (livreur Kimoxa)
- Acheteur paie : 11 000 F
- Commission Kimoxa : 550 F
- Vendeur (séquestre) : 9 450 F
- Livreur : 1 000 F

## 3. Règles absolues (non négociables)

| # | Règle | Implémentation |
|---|---|---|
| R1 | Commission 5,5 % sur les PRODUITS uniquement | `orders/route.js` : COMMISSION_RATE = 0.055 |
| R2 | Les frais de paiement en ligne (CinetPay) sont supportés par KIMOXA, jamais déduits du vendeur | À respecter à l'activation CinetPay |
| R3 | Frais de livraison : 100 % à celui qui livre (`delivers_own_orders` + boutique unique → boutique ; sinon → livreur) | `fulfilled_by` dans orders |
| R4 | Séquestre : l'argent du vendeur est `held` jusqu'à livraison, puis `released`, puis `paid` par l'admin | `shop_commission_ledger.payout_status` |
| R5 | Le prix payé est figé à la commande (anti-arnaque) | `order_items.price_at_purchase` |
| R6 | Un produit vendu ne peut JAMAIS être supprimé | DELETE stock/[id] → 409 + audit `delete_product_denied` |
| R7 | Toute action financière ou sensible est tracée | `security_audit_log` + `payout_attempts` (idempotence) |
| R8 | 1 vendeur = 1 boutique | Migration 003 (index unique) |
| R9 | Commande pending non confirmée sous 24 h = annulée + stock restauré + vendeur notifié | Migration 002 + `cancelExpiredOrders.js` |

## 4. Cycle de vie de l'argent vendeur

## 5. Payouts (règles opérationnelles)

- Seul un ADMIN peut déclencher un payout.
- Méthodes : orange_money, moov_money, bank_transfer, cash.
- Idempotence obligatoire via `payout_attempts.idempotency_key`.
- Un payout ne peut concerner qu'un ledger `released`.

## 6. Annulations & expirations

- Commande `pending` > 24 h → `cancelled` automatique.
- Effets : stock restauré (+ mouvement tracé), ledger et courier_payouts supprimés, email vendeur, audit `order_expired`.
- Annulation manuelle avant paiement : mêmes effets (à implémenter si route dédiée).

## 7. Tables financières de référence

| Table | Rôle |
|---|---|
| `orders` | Total, frais livraison, méthode paiement, expiration |
| `order_items` | Lignes de commande + prix figé |
| `shop_commission_ledger` | Cœur : commission, payout, statuts held/released/paid |
| `courier_payouts` | Argent des livreurs |
| `admin_payout_transactions` | Preuve des payouts admin |
| `payout_attempts` | Idempotence anti double-paiement |
| `payments` | Collecte CinetPay (Phase 3C) |

## 8. Contrôles prévus (P2, Phase 6)

- Réconciliation quotidienne : Σ ledger vs Σ commandes vs Σ payouts.
- Alerte si montant négatif ou payout sans ledger `released`.
- Remplacement rate-limit mémoire → Upstash (multi-serveur).

## 9. Historique des décisions

| Date | Décision | Trace |
|---|---|---|
| 2026-08-11 | Stabilisation base + index + unification MoMo | migrations/001 |
| 2026-08-11 | Expiration 24 h des pendings | migrations/002 |
| 2026-08-11 | 1 vendeur = 1 boutique | migrations/003 |
| 2026-08-11 | Suspensions temps réel + IDOR clos + audit log | Commits sécurité |
