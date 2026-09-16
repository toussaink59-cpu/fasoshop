// @ts-check
//
// Test générique (V-04) : découvre TOUTES les routes API du dépôt à la
// volée (lecture du système de fichiers, pas de liste codée en dur des
// routes à tester) et vérifie qu'aucune route sensible ne répond avec
// succès à un appel sans authentification.
//
// Une route est considérée comme protégée par défaut SAUF si elle figure
// explicitement dans la liste blanche ci-dessous, avec sa raison.
//
// Ce test permet notamment de détecter les oublis de protection sur les
// nouvelles routes API.

import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const API_DIR = path.join(process.cwd(), "app", "api");

// ============================================================================
// WHITELIST
// ============================================================================
//
// Chemin -> raison documentée pour laquelle l'absence de JWT est normale.
//
// Toute route absente de cette liste DOIT renvoyer 401/403 sans cookie.
//
// IMPORTANT :
// - Les webhooks sont protégés par signature et non par JWT.
// - Les routes internes utilisent un secret interne.
// - Les crons utilisent CRON_SECRET.
// - Certaines routes publiques font volontairement partie du catalogue public.
// - /api/sandbox/simulate est testée séparément dans idor-negative.spec.js.
//

const WHITELIST = {
  // --------------------------------------------------------------------------
  // Authentification publique
  // --------------------------------------------------------------------------

  "/auth/login":
    "Public par design : endpoint de connexion",

  "/auth/register":
    "Public par design : création de compte",

  "/auth/logout":
    "Doit fonctionner même sans session active",

  "/auth/me":
    "Renvoie simplement null si non connecté, sans données sensibles",

  "/auth/forgot-password":
    "Public par design, protégé par rate-limit + anti-énumération",

  "/auth/google":
    "OAuth Google : redirige vers accounts.google.com",

  "/auth/google/callback":
    "OAuth Google callback : échange le code puis définit la session",

  "/auth/reset-password":
    "Public par design, protégé par token de réinitialisation + rate-limit",

  // --------------------------------------------------------------------------
  // Compte
  // --------------------------------------------------------------------------

  "/account/password":
    "Changement de mot de passe : protégé par le middleware",

  "/account":
    "Compte utilisateur : protégé par le middleware",

  // --------------------------------------------------------------------------
  // Catalogue public
  // --------------------------------------------------------------------------

  "/categories":
    "Catalogue public",

  "/flash-sales":
    "Catalogue public",

  "/shops":
    "Annuaire boutiques public",

  "/shops/cities":
    "Donnée publique : liste des villes",

  "/shops/delivery":
    "Donnée publique : frais de livraison affichés avant connexion",

  "/shops/directory":
    "Annuaire boutiques public",

  "/products":
    "Catalogue public",

  "/products/[id]":
    "Fiche produit publique",

  "/products/[id]/reviews":
    "Avis publics en lecture",

  "/products/brands":
    "Catalogue public",

  "/products/homepage":
    "Catalogue public",

  "/products/suggestions":
    "Catalogue public",

  // --------------------------------------------------------------------------
  // Paiements / intégrations techniques
  // --------------------------------------------------------------------------

  "/payments/[provider]/webhook":
    "Protégé par signature HMAC du fournisseur, pas par JWT",

  "/internal/session-status":
    "Protégé par secret interne (x-internal-secret), pas par JWT",

  // --------------------------------------------------------------------------
  // CRONS
  // --------------------------------------------------------------------------

  "/cron/abandoned-carts":
    "Protégé par CRON_SECRET avec comparaison timing-safe",

  "/cron/auto-confirm":
    "Protégé par CRON_SECRET avec comparaison timing-safe",

  "/cron/auto-payout":
    "Protégé exclusivement par CRON_SECRET ; renvoie volontairement 404 sans authentification/secret valide",

  "/cron/expire-orders":
    "Protégé par CRON_SECRET avec comparaison timing-safe",

  "/cron/cleanup-reset-tokens":
    "Protégé par CRON_SECRET avec authentification technique de cron",

  // --------------------------------------------------------------------------
  // Push
  // --------------------------------------------------------------------------

  "/push/vapid-public-key":
    "Public par design : la clé VAPID publique est requise par le frontend pour s'abonner aux notifications push",

  // --------------------------------------------------------------------------
  // Sandbox
  // --------------------------------------------------------------------------

  "/sandbox/simulate":
    "Endpoint sandbox à accès capability ; testé séparément dans idor-negative.spec.js",

  // --------------------------------------------------------------------------
  // Outils de test
  // --------------------------------------------------------------------------

  "/test-helpers":
    "Verrouillé par NODE_ENV + ALLOW_TEST_HELPERS",

  "/test-helpers/create-shop-product":
    "Verrouillé par NODE_ENV + ALLOW_TEST_HELPERS",

  "/test-helpers/create-user":
    "Verrouillé par NODE_ENV + ALLOW_TEST_HELPERS",
};

// ============================================================================
// Conversion des routes dynamiques vers une URL concrète
// ============================================================================

function toConcreteUrl(routePath) {
  return routePath
    .replace(/\[provider\]/g, "sandbox")
    .replace(/\[id\]/g, "1")
    .replace(/\[productId\]/g, "1")
    .replace(/\[orderId\]/g, "1");
}

// ============================================================================
// Découverte dynamique des routes API
// ============================================================================

function discoverRoutes(dir, base = "") {
  const routes = [];

  for (const entry of fs.readdirSync(dir, {
    withFileTypes: true,
  })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      routes.push(
        ...discoverRoutes(
          full,
          base + "/" + entry.name
        )
      );
    } else if (entry.name === "route.js") {
      const content = fs.readFileSync(
        full,
        "utf-8"
      );

      const methods = [
        ...content.matchAll(
          /export async function (GET|POST|PATCH|PUT|DELETE)\s*\(/g
        ),
      ].map((match) => match[1]);

      routes.push({
        routePath: base || "/",
        methods,
      });
    }
  }

  return routes;
}

// ============================================================================
// Tests
// ============================================================================

test.describe(
  "9. Scan générique — auth obligatoire par défaut (V-04)",
  () => {
    const routes = discoverRoutes(API_DIR);

    const toTest = routes.filter(
      (route) =>
        !(route.routePath in WHITELIST)
    );

    test(
      `inventaire : ${routes.length} routes découvertes, ` +
        `${toTest.length} à tester ` +
        `(${Object.keys(WHITELIST).length} en liste blanche)`,
      () => {
        expect(routes.length).toBeGreaterThan(0);
      }
    );

    for (const {
      routePath,
      methods,
    } of toTest) {
      for (const method of methods) {
        test(
          `${method} ${routePath} sans cookie -> refuse (401/403), jamais un succès`,
          async ({ request }) => {
            const url =
              "/api" +
              toConcreteUrl(routePath);

            const res =
              await request.fetch(url, {
                method,

                data:
                  method === "GET" ||
                  method === "DELETE"
                    ? undefined
                    : {},

                failOnStatusCode: false,
              });

            expect(
              [401, 403].includes(
                res.status()
              ),
              `${method} ${url} a répondu ` +
                `${res.status()} sans authentification — ` +
                `si cette route est légitimement publique, ` +
                `ajoute-la à WHITELIST dans ce fichier ` +
                `avec la raison.`
            ).toBeTruthy();
          }
        );
      }
    }
  }
);