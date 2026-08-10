# Kimoxa — Marketplace multi-vendeurs

**Kimoxa** est une marketplace multi-vendeurs pensée pour l'Afrique, avec une première cible au Burkina Faso. Le projet a évolué depuis son prototype initial « FasoShop — Phase 1 » vers une application e-commerce complète en phase finale de stabilisation et de pré-production.

> Le dépôt GitHub conserve le nom technique `fasoshop` pour l'instant, mais l'identité produit de l'application est désormais **Kimoxa**.

## État du projet

**Phase actuelle : phase finale — stabilisation, sécurité, performances et validation avant production.**

Les principaux parcours de la marketplace sont déjà présents :

- catalogue et fiches produits ;
- boutiques et annuaire des vendeurs ;
- authentification et gestion de compte ;
- panier et favoris ;
- commandes et confirmation de réception ;
- adresses ;
- messagerie ;
- factures ;
- espace vendeur : boutique, produits, stock, commandes et revenus ;
- espace administrateur : dashboard, produits, boutiques, commandes, paiements, modération, conversations et analytics ;
- pages institutionnelles : À propos, CGU, CGV, FAQ, retours et devenir-vendeur ;
- PWA et installation mobile ;
- Service Worker **Kimoxa v4** avec stratégie de cache séparant les assets et les pages publiques, tout en excluant les données privées du cache.

## Stack

- Next.js 15 — App Router
- React 18
- PostgreSQL / Neon via `postgres.js`
- Authentification JWT avec `jose`
- Hashage des mots de passe avec `bcryptjs`
- Uploads avec Vercel Blob
- PWA / Service Worker
- Déploiement cible : Vercel

## Démarrage local

```bash
npm install
cp .env.local.example .env.local
# renseigner DATABASE_URL et JWT_SECRET

npm run db:migrate
npm run dev
```

Application locale : `http://localhost:3000`

Pour tester le Service Worker, utiliser une build de production :

```bash
npm run build
npm run start
```

## Rôles

- `buyer` — consulte le catalogue, achète et gère ses commandes ;
- `vendor` — gère sa boutique, ses produits, son stock, ses commandes et ses revenus ;
- `admin` — supervise la marketplace et les données globales.

## Architecture du Service Worker

Le Service Worker actif est `public/sw.js`.

### Kimoxa v4

Deux caches sont utilisés :

- `kimoxa-v4-assets` — ressources statiques ;
- `kimoxa-v4-pages` — pages publiques pouvant être utilisées en secours hors ligne.

Les routes sensibles et données privées restent en **réseau uniquement**, notamment les API et les espaces authentifiés (`account`, `cart`, `orders`, `messages`, `vendor`, `admin`, etc.).

La v4 a été validée en production locale avec :

- enregistrement du Service Worker ;
- état `activated` ;
- création des deux caches ;
- fonctionnement hors ligne d'une page publique comme `/faq` ;
- absence de mise en cache volontaire des routes privées.

## Vérification avant production

Avant la mise en production, les contrôles prioritaires sont :

1. tests fonctionnels complets des parcours acheteur, vendeur et administrateur ;
2. tests de sécurité et d'isolation des données ;
3. validation des paiements et commandes en conditions réelles ;
4. tests PWA / Service Worker sur mobile et desktop ;
5. validation des variables d'environnement et de la base de production ;
6. build et déploiement final ;
7. audit final des performances, SEO et accessibilité.

## Historique du projet

Le dépôt a commencé sous le nom **FasoShop — Phase 1**. Cette description correspond à l'état initial du projet et n'était plus représentative de l'application actuelle. Le produit a depuis été renommé **Kimoxa** et considérablement étendu.
