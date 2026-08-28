// @ts-check
// Test générique (V-04) : découvre TOUTES les routes API du dépôt à la
// volée (lecture du système de fichiers, pas de liste codée en dur des
// routes à tester) et vérifie qu'aucune route sensible ne répond avec
// succès à un appel sans authentification.
//
// C'est ce test qui aurait dû détecter V-01 (/api/cart/sync) automatiquement
// avant qu'un audit manuel ne le trouve : plutôt que de tester route par
// route, on part du principe qu'une route est protégée SAUF si elle figure
// explicitement dans la liste blanche ci-dessous, avec la raison écrite.
import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const API_DIR = path.join(process.cwd(), "app", "api");

// Chemin -> raison documentée pour laquelle l'absence de JWT est normale.
// Toute route absente de cette liste DOIT renvoyer 401/403 sans cookie.
const WHITELIST = {
  "/auth/login": "Public par design (authentification elle-même)",
  "/auth/register": "Public par design",
  "/auth/logout": "Doit fonctionner même sans session active",
  "/auth/me": "Renvoie simplement null si non connecté, pas de données sensibles",
  "/auth/forgot-password": "Public par design, protégé par rate-limit + anti-énumération",
    "/auth/google": "OAuth Google : redirige vers accounts.google.com (public par design)",
    "/auth/google/callback": "OAuth Google callback : échange code + set cookie (public par design)",
    "/account/password": "Changement mot de passe (protégé par middleware)",
    "/account": "Compte utilisateur (protégé par middleware mais scan GET renvoie 401 sans cookie — OK)",
  "/auth/reset-password": "Public par design, protégé par token 256 bits + rate-limit",
  "/categories": "Catalogue public",
  "/flash-sales": "Catalogue public",
  "/shops": "Annuaire boutiques public",
  "/shops/cities": "Donnée publique (liste de villes)",
  "/shops/delivery": "Donnée publique (frais de livraison affichés avant connexion)",
  "/shops/directory": "Annuaire boutiques public",
  "/products": "Catalogue public",
  "/products/[id]": "Fiche produit publique",
  "/products/[id]/reviews": "Avis publics en lecture (GET)",
  "/products/brands": "Catalogue public",
  "/products/homepage": "Catalogue public",
  "/products/suggestions": "Catalogue public",
  "/payments/[provider]/webhook": "Protégé par signature HMAC du fournisseur, pas par JWT",
  "/internal/session-status": "Protégé par secret interne (x-internal-secret), pas par JWT",
  "/cron/abandoned-carts": "Protégé par CRON_SECRET (timing-safe)",
  "/cron/auto-confirm": "Protégé par CRON_SECRET (timing-safe)",
  "/cron/expire-orders": "Protégé par CRON_SECRET (timing-safe)",
  "/push/vapid-public-key": "Public par design : la clé VAPID publique est requise par le frontend pour s'abonner aux notifications push",
  "/sandbox/simulate": "Auto-verrouillé : renvoie 404 si le provider n'est pas sandbox",
  "/test-helpers": "Verrouillé par NODE_ENV + ALLOW_TEST_HELPERS (voir 04-test-helpers-guard.mjs)",
  "/test-helpers/create-shop-product": "Verrouillé par NODE_ENV + ALLOW_TEST_HELPERS",
  "/test-helpers/create-user": "Verrouillé par NODE_ENV + ALLOW_TEST_HELPERS",
};

// Valeur de remplacement pour chaque segment dynamique rencontré dans les chemins.
function toConcreteUrl(routePath) {
  return routePath
    .replace(/\[provider\]/g, "sandbox")
    .replace(/\[id\]/g, "1")
    .replace(/\[productId\]/g, "1")
    .replace(/\[orderId\]/g, "1");
}

function discoverRoutes(dir, base = "") {
  const routes = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      routes.push(...discoverRoutes(full, base + "/" + entry.name));
    } else if (entry.name === "route.js") {
      const methods = [...fs.readFileSync(full, "utf-8")
        .matchAll(/export async function (GET|POST|PATCH|PUT|DELETE)\s*\(/g)]
        .map((m) => m[1]);
      routes.push({ routePath: base || "/", methods });
    }
  }
  return routes;
}

test.describe("9. Scan générique — auth obligatoire par défaut (V-04)", () => {
  const routes = discoverRoutes(API_DIR);
  const toTest = routes.filter((r) => !(r.routePath in WHITELIST));

  test(`inventaire : ${routes.length} routes découvertes, ${toTest.length} à tester (${Object.keys(WHITELIST).length} en liste blanche)`, () => {
    expect(routes.length).toBeGreaterThan(0);
  });

  for (const { routePath, methods } of toTest) {
    for (const method of methods) {
      test(`${method} ${routePath} sans cookie -> refuse (401/403), jamais un succès`, async ({ request }) => {
        const url = "/api" + toConcreteUrl(routePath);
        const res = await request.fetch(url, {
          method,
          data: method === "GET" || method === "DELETE" ? undefined : {},
          failOnStatusCode: false,
        });
        expect(
          [401, 403].includes(res.status()),
          `${method} ${url} a répondu ${res.status()} sans authentification — ` +
          `si cette route est légitimement publique, ajoute-la à WHITELIST dans ce fichier avec la raison.`
        ).toBeTruthy();
      });
    }
  }
});
