# Kimoxa — Marketplace multi-vendeurs

**Kimoxa** est une marketplace e-commerce multi-vendeurs conçue pour le marché africain, avec une première implantation au Burkina Faso.

Le projet a commencé sous le nom **FasoShop**. L'identité produit a depuis été renommée **Kimoxa**, tandis que le dépôt GitHub conserve actuellement le nom technique `fasoshop`.

> **Statut : phase finale du projet — stabilisation, sécurité, tests et préparation à la mise en production.**

---

## 🎯 Vision

Kimoxa permet de réunir acheteurs, vendeurs et administrateurs au sein d'une même plateforme afin de proposer une expérience marketplace moderne, sécurisée et adaptée aux réalités du marché africain.

L'architecture est pensée pour évoluer progressivement vers une plateforme complète intégrant plusieurs moyens de paiement et des services numériques.

---

## 🚀 Fonctionnalités principales

### 🛍️ Expérience acheteur

- Catalogue de produits
- Recherche et navigation par catégories
- Fiches produits
- Boutiques vendeurs
- Panier
- Favoris
- Gestion du compte
- Gestion des adresses
- Passage de commandes
- Suivi des commandes
- Confirmation de réception
- Factures
- Messagerie
- Pages FAQ et informations marketplace

### 🏪 Espace vendeur

- Création et gestion de boutique
- Gestion des produits
- Gestion des images produits
- Gestion du stock
- Gestion des commandes
- Suivi des ventes et revenus
- Gestion des informations de boutique
- Fonctionnalités liées à la modération et à la conformité vendeur

### 🛡️ Administration

- Tableau de bord administrateur
- Gestion des produits
- Gestion des boutiques
- Gestion des commandes
- Gestion des utilisateurs
- Modération
- Gestion des paiements et opérations associées
- Conversations
- Analytics
- Gestion et supervision des données de la marketplace

### 📱 PWA

Kimoxa dispose d'une architecture PWA avec Service Worker pour améliorer l'expérience sur mobile et desktop.

Le Service Worker est situé dans :

```text
public/sw.js
```

La logique d'enregistrement est intégrée à l'application via :

```text
app/components/ServiceWorker.js
```

Les ressources publiques peuvent être mises en cache pour améliorer la résilience de l'interface, tandis que les zones sensibles et les données privées ne doivent pas être servies depuis un cache public.

---

## 💳 Architecture des paiements

Le projet possède une couche d'abstraction des fournisseurs de paiement afin de pouvoir connecter progressivement les solutions adaptées au marché ciblé.

Les principaux éléments sont notamment :

```text
lib/payment/provider.js
app/api/orders/[id]/pay/route.js
app/api/payments/[provider]/webhook/route.js
```

### État actuel

Les intégrations **CinetPay** et **Ligdicash** sont prévues pour la phase finale de branchement et de validation des paiements réels.

Elles ne doivent donc pas être considérées comme des fonctionnalités définitivement opérationnelles tant que leur configuration, leurs webhooks, leurs tests de bout en bout et leur validation en production n'ont pas été terminés.

---

## 🔐 Sécurité

La sécurité fait partie des priorités de la phase finale du projet.

Les contrôles et renforcements portent notamment sur :

- authentification et autorisation par rôle ;
- isolation des données acheteur, vendeur et administrateur ;
- validation des entrées API ;
- protection des opérations sensibles ;
- gestion sécurisée des sessions et tokens ;
- protection des opérations liées aux commandes et au stock ;
- journalisation des opérations importantes ;
- limitation des paramètres de pagination ;
- protection contre les abus sur les endpoints sensibles ;
- sécurisation des migrations et opérations de base de données ;
- réduction des informations sensibles dans les logs ;
- contrôle des dépendances npm et des vulnérabilités connues.

Les audits de sécurité et les corrections associées doivent être considérés comme faisant partie du processus de stabilisation avant production.

---

## 🧱 Stack technique

### Front-end / application

- **Next.js 15** — App Router
- **React 18**
- JavaScript
- CSS / interface responsive

### Back-end / données

- API Routes Next.js
- **PostgreSQL**
- **postgres.js**
- Migrations SQL/JavaScript

### Authentification et sécurité

- **jose** pour les JWT
- **bcryptjs** pour le hashage des mots de passe

### Stockage et services

- **Vercel Blob** pour les fichiers/images
- **Resend** pour les fonctionnalités e-mail
- Service Worker / PWA

### Déploiement

- **Vercel** comme plateforme de déploiement cible
- Base PostgreSQL compatible environnement serverless

---

## 📂 Structure générale

```text
fasoshop/
├── app/                    # Pages, composants et API Next.js
│   ├── api/                # Endpoints backend
│   ├── admin/              # Espace administrateur
│   ├── vendor/             # Espace vendeur
│   ├── account/            # Espace acheteur
│   └── ...
├── db/                     # Migrations et scripts base de données
├── lib/                    # Logique métier, requêtes et services
│   ├── payment/             # Abstraction des paiements
│   └── queries/             # Requêtes et accès aux données
├── public/                 # Assets publics et Service Worker
├── package.json
├── package-lock.json
└── README.md
```

---

## ⚙️ Installation locale

### Prérequis

- Node.js compatible avec la version de Next.js utilisée
- npm
- PostgreSQL / base PostgreSQL accessible
- Variables d'environnement nécessaires au projet

### Installation

```bash
git clone https://github.com/toussaink59-cpu/fasoshop.git
cd fasoshop
npm install
```

Créer ensuite le fichier d'environnement local :

```text
.env.local
```

et renseigner les variables nécessaires, notamment les paramètres de connexion à la base de données et les secrets d'authentification.

### Base de données

```bash
npm run db:migrate
```

### Développement

```bash
npm run dev
```

Application locale :

```text
http://localhost:3000
```

### Production locale

```bash
npm run build
npm run start
```

---

## 📜 Scripts disponibles

| Commande | Utilisation |
|---|---|
| `npm run dev` | Lance le serveur de développement |
| `npm run build` | Génère le build de production |
| `npm run start` | Lance l'application en mode production |
| `npm run lint` | Lance le contrôle de lint configuré dans le projet |
| `npm run db:migrate` | Exécute les migrations de base de données |

---

## 👥 Rôles applicatifs

| Rôle | Responsabilités |
|---|---|
| `buyer` | Parcourir, acheter et suivre ses commandes |
| `vendor` | Gérer sa boutique, ses produits, son stock, ses commandes et ses revenus |
| `admin` | Superviser la marketplace, la modération, les opérations et les données globales |

---

## 🧪 Validation avant production

La phase finale doit notamment couvrir :

1. Tests fonctionnels complets des parcours acheteur, vendeur et administrateur.
2. Tests d'authentification et d'autorisation.
3. Tests d'isolation des données entre utilisateurs et vendeurs.
4. Tests des commandes, du stock et des états de paiement.
5. Branchement et tests de bout en bout des fournisseurs de paiement retenus.
6. Validation des webhooks de paiement et de leur sécurité.
7. Tests PWA / Service Worker sur desktop et mobile.
8. Vérification des variables d'environnement de production.
9. Vérification des dépendances npm et des vulnérabilités restantes.
10. Build de production et validation du déploiement.
11. Audit final des performances, SEO et accessibilité.

---

## 🗺️ Feuille de route finale

### Phase actuelle — Finalisation

- [x] Architecture marketplace multi-vendeurs
- [x] Parcours acheteur
- [x] Espace vendeur
- [x] Espace administrateur
- [x] Gestion catalogue / produits
- [x] Gestion stock
- [x] Gestion commandes
- [x] Authentification et rôles
- [x] PWA / Service Worker
- [x] Renforcement de la sécurité
- [x] Audit du code et des endpoints
- [ ] Finalisation des intégrations de paiement
- [ ] Tests de bout en bout des paiements
- [ ] Validation finale production

### Après lancement

- Extension progressive des moyens de paiement
- Améliorations UX/UI
- Optimisation des performances
- Automatisation accrue de la supervision
- Développement de nouvelles fonctionnalités marketplace
- Extension à d'autres marchés africains

---

## 💰 Modèle marketplace

Kimoxa fonctionne selon un modèle multi-vendeurs : les vendeurs proposent leurs produits sur la plateforme et Kimoxa peut appliquer une commission sur les ventes selon les règles commerciales configurées.

Les règles définitives de commission, de reversement vendeur et de paiement doivent être validées avec les fournisseurs de paiement avant l'activation des paiements réels.

---

## 🌍 Positionnement

Kimoxa est développé avec une priorité donnée au marché africain, en particulier au Burkina Faso, avec l'objectif de proposer une expérience marketplace moderne, accessible et adaptée aux besoins des acheteurs et vendeurs locaux.

---

## 📌 Nom du projet

**Nom produit : Kimoxa**

**Nom technique actuel du dépôt : fasoshop**

Le changement de nom produit n'implique pas encore un renommage technique complet du dépôt GitHub, des chemins locaux ou de certains identifiants internes.

---

## 👨‍💻 Projet

**Kimoxa — Marketplace multi-vendeurs**

Projet développé pour construire une plateforme e-commerce moderne destinée au marché africain.

**Dépôt GitHub :** `toussaink59-cpu/fasoshop`
