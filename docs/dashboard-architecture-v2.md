# KIMOXA — Architecture Dashboard V2

## Objectif

Préparer un dashboard professionnel Admin + Vendeur inspiré des standards modernes de marketplace, sans remplacer l'architecture métier existante et sans introduire de données fictives.

## État vérifié sur `main`

- Framework : Next.js 15.5.23 + React 18.
- Base : PostgreSQL via `postgres` et `@/lib/db`.
- Authentification : JWT httpOnly via `lib/auth.js`.
- Protection : `middleware.js` vérifie le JWT, le rôle et le statut réel en base.
- Rôles : `buyer`, `vendor`, `admin`.
- Routes back-office déjà séparées : `/admin/*` et `/vendor/*`.
- Navigation mobile dédiée : `AdminBottomNav.js` et `VendorBottomNav.js`.
- Données financières : `shop_commission_ledger`.
- Commission actuelle : 9% côté produit/UI ; le schéma conserve une colonne historique `commission_rate` avec défaut 5.5, donc les nouveaux écrans ne doivent jamais déduire le taux à partir de cette valeur par défaut.

## Données déjà disponibles

### Admin

- `GET /api/admin/orders` : commandes récentes + statistiques du jour et globales.
- `GET /api/admin/earnings` : commissions globales et montants de payout.
- `GET /api/admin/analytics` : séries 30 jours, 6 mois, catégories, vendeurs et top produits.
- `GET /api/admin/analytics/series` : granularité horaire, quotidienne ou mensuelle.
- `GET /api/admin/shops` : boutiques et statuts.
- `GET /api/admin/payouts` : gestion des payouts.
- `GET /api/admin/reviews` : modération des avis.
- `GET /api/admin/conversations` : surveillance des conversations.

### Vendeur

- `GET /api/vendor/revenue` : ventes, commissions, net dû/réglé, commandes et série 30 jours.
- `GET /api/vendor/earnings` : ledger financier de la boutique.
- `GET /api/vendor/orders` : commandes/sous-commandes de la boutique.
- `GET /api/vendor/stock` : produits, stock et informations commerciales.
- `GET /api/vendor/shop` : profil/statut de la boutique.
- `GET /api/conversations/unread-count` : compteur de messages non lus.

## Tables métier utiles au dashboard

- `users`
- `shops`
- `products`
- `orders`
- `order_items`
- `shop_commission_ledger`
- `admin_payout_transactions`
- `courier_payouts`
- `conversations`
- `messages`
- `reviews`
- `sponsorship_requests`
- `stock_movements`
- `security_audit_log`

## Architecture UI cible

```text
app/
├── admin/
│   └── dashboard/
│       ├── page.js
│       └── components/
│           ├── AdminDashboardShell.js
│           ├── AdminKpiGrid.js
│           ├── AdminRevenueChart.js
│           ├── AdminOrderDistribution.js
│           ├── AdminRecentActivity.js
│           ├── AdminPayoutsPanel.js
│           ├── AdminTopVendors.js
│           └── AdminAlerts.js
│
├── vendor/
│   └── dashboard/
│       ├── page.js
│       └── components/
│           ├── VendorDashboardShell.js
│           ├── VendorKpiGrid.js
│           ├── VendorRevenueChart.js
│           ├── VendorOrderDistribution.js
│           ├── VendorRecentOrders.js
│           ├── VendorTopProducts.js
│           ├── VendorLowStock.js
│           └── VendorReviews.js
│
└── components/
    └── dashboard/
        ├── DashboardCard.js
        ├── DashboardKpi.js
        ├── DashboardSection.js
        ├── DashboardSkeleton.js
        └── DashboardChartTooltip.js
```

Les composants listés ci-dessus sont une cible d'organisation, pas une obligation de créer tous les fichiers immédiatement. La priorité est de réutiliser les composants et styles déjà présents lorsqu'ils sont compatibles.

## Règles de sécurité

1. Ne jamais faire confiance à un `userId`, `shopId` ou rôle fourni par le navigateur.
2. Les routes `/api/admin/*` restent protégées par `middleware.js` et doivent conserver cette protection.
3. Les données vendeur doivent toujours être filtrées par le `shop_id` appartenant au vendeur authentifié.
4. Aucun KPI financier ne doit être calculé côté client à partir de données non autorisées.
5. Aucun montant fictif ou fallback numérique ne doit être ajouté pour embellir l'interface.
6. Les nouveaux endpoints analytiques sensibles doivent reprendre la défense en profondeur existante et le rate limiting lorsqu'une consultation répétée est coûteuse.
7. Les corrections P0 des commandes/payouts restent hors périmètre du redesign visuel et ne doivent pas être réécrites pour le dashboard.

## Principes UX

- Desktop : sidebar + topbar + grille de cartes + graphiques + panneaux secondaires.
- Mobile : navigation basse existante conservée, contenu en une colonne, cartes empilées, graphiques lisibles et tables transformées en listes/cartes.
- KIMOXA : identité visuelle cohérente avec le logo et la palette existante ; pas de copie de la maquette de référence.
- Les périodes et filtres doivent être explicites.
- Les états de chargement, vide, erreur et absence de données doivent être prévus.
- Les chiffres monétaires sont affichés en FCFA avec format `fr-FR`.

## Ordre d'implémentation recommandé

1. Construire le shell visuel commun sans modifier les API.
2. Transformer `/admin/dashboard` en véritable vue synthèse en réutilisant les endpoints existants.
3. Transformer `/vendor/dashboard` en véritable vue synthèse ; déplacer la gestion produit vers une route dédiée si nécessaire, sans supprimer les fonctionnalités actuelles.
4. Ajouter uniquement les endpoints analytiques manquants après vérification SQL.
5. Ajouter les graphiques avec les séries réelles déjà exposées.
6. Vérifier les permissions admin/vendor sur chaque endpoint utilisé.
7. Tester desktop + mobile.
8. Exécuter `npm run build` avant intégration.

## Contraintes de non-régression

- Ne pas modifier le catalogue public.
- Ne pas modifier le panier/paiement.
- Ne pas modifier CinetPay/Ligdicash.
- Ne pas modifier les règles de payout P0.
- Ne pas modifier `middleware.js` uniquement pour faciliter le dashboard.
- Ne pas supprimer les pages vendeur existantes (`orders`, `revenue`, `account`) sans migration fonctionnelle explicite.
- Ne pas réorganiser `globals.css` globalement pendant le premier passage du dashboard.
