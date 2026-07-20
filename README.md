# FasoShop — Phase 1

Marketplace multi-vendeur pour le Burkina Faso, avec gestion de stock intégrée
dès le départ : chaque vendeur suit son propre stock, l'administrateur voit
tout, toutes boutiques confondues.

## Stack

- Next.js 15 (App Router)
- PostgreSQL via Neon (postgres.js, SQL brut)
- Authentification JWT (jose) + bcryptjs, cookie httpOnly
- Déploiement cible : Vercel

## Démarrage

```bash
npm install
cp .env.local.example .env.local
# puis remplir DATABASE_URL et JWT_SECRET dans .env.local

npm run db:migrate   # crée les tables sur Neon
npm run dev           # démarre le serveur local sur http://localhost:3000
```

## Rôles

- `buyer` — acheteur, accède au catalogue public
- `vendor` — vendeur, gère sa propre boutique et son propre stock uniquement
- `admin` — voit et gère tous les stocks de toutes les boutiques

## Endpoints principaux

| Méthode | Route | Accès | Description |
|---|---|---|---|
| POST | `/api/auth/register` | public | Créer un compte (buyer ou vendor) |
| POST | `/api/auth/login` | public | Connexion |
| POST | `/api/auth/logout` | public | Déconnexion |
| GET | `/api/auth/me` | public | Utilisateur connecté |
| GET | `/api/products` | public | Catalogue produits actifs |
| GET | `/api/vendor/stock` | vendor | Liste des produits de SA boutique |
| POST | `/api/vendor/stock` | vendor | Créer un produit (avec stock initial) |
| PATCH | `/api/vendor/stock/:id` | vendor | Ajuster le stock d'un de ses produits |
| GET | `/api/admin/stock` | admin | Stock de TOUTES les boutiques (filtres `?shopId=` `?lowStockOnly=true`) |
| GET | `/api/admin/shops` | admin | Liste des boutiques avec stock total |

## Prochaines étapes

1. Créer les pages UI (dashboard vendeur, dashboard admin, catalogue acheteur)
2. Flux de commande complet (paiement, décrémentation automatique du stock)
3. Notifications de stock faible
