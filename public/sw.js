/* =====================================================
   SERVICE WORKER KIMOXA v4 — cache contrôlé et prévisible
   ─ API + routes privées : réseau uniquement 🔒
   ─ Assets statiques     : cache-first + limite (80) ⚡
   ─ Pages publiques (liste blanche) : network-first +
     fallback hors-ligne propre (jamais de / par défaut) 🌐
   ─ Tout le reste        : réseau normal, non intercepté
===================================================== */

const ASSETS_CACHE = "kimoxa-v5-assets";
const PAGES_CACHE = "kimoxa-v5-pages";
const ASSET_LIMIT = 80;
const PAGE_LIMIT = 20;

// 🔒 Réseau uniquement : aucune donnée sensible en cache
const NETWORK_ONLY = [
  "/api",
  "/account",
  "/cart",
  "/orders",
  "/messages",
  "/favoris",
  "/vendor",
  "/admin",
  "/login",
  "/register",
];

// 🌐 Liste blanche des pages publiques mises en cache
const PUBLIC_PAGES = [
  "/",
  "/a-propos",
  "/cgu",
  "/cgv",
  "/faq",
  "/retours",
  "/nos-vendeurs",
  "/devenir-vendeur",
];

// ⚡ Assets statiques immuables
const STATIC_PREFIXES = ["/_next/static/", "/icons/"];
const STATIC_EXT = [".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".woff", ".woff2"];

const isNetworkOnly = (path) =>
  NETWORK_ONLY.some((p) => path === p || path.startsWith(p + "/"));

const isStaticAsset = (path) =>
  STATIC_PREFIXES.some((p) => path.startsWith(p)) ||
  STATIC_EXT.some((ext) => path.endsWith(ext));

const isPublicPage = (path) => PUBLIC_PAGES.includes(path);

const isNavigation = (req) =>
  req.mode === "navigate" ||
  (req.headers.get("accept") || "").includes("text/html");

/* ----- Cycle de vie ----- */

self.addEventListener("install", (e) => {
  self.skipWaiting();
  // Préchauffe le fallback accueil (silencieux si hors ligne)
  e.waitUntil(
    caches.open(PAGES_CACHE).then((cache) => cache.add("/")).catch(() => {})
  );
});

self.addEventListener("activate", (e) => {
  // Supprime tous les anciens caches (v1, v2, v3…)
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== ASSETS_CACHE && k !== PAGES_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* ----- Limites de cache ----- */

async function trimCache(name, limit) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  while (keys.length > limit) {
    await cache.delete(keys.shift());
  }
}

/* ----- Page hors-ligne propre (jamais de / servi par erreur) ----- */

function offlineResponse() {
  const html = `<!doctype html>
<html lang="fr">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kimoxa — Hors ligne</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
  background:#241712;color:#fcfaf6;font-family:system-ui,sans-serif;text-align:center;padding:24px}
  h1{font-size:1.4rem;margin:0 0 8px}
  p{opacity:.8;margin:0 0 18px}
  a{display:inline-block;padding:10px 22px;border-radius:999px;background:#e8720c;
  color:#fff;text-decoration:none;font-weight:700}
</style>
<h1>📴 Vous êtes hors ligne</h1>
<p>Reconnectez-vous pour continuer sur Kimoxa.</p>
<a href="/">Réessayer</a>
</html>`;
  return new Response(html, {
    status: 503,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

/* ----- Stratégies par type de requête ----- */

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  const path = url.pathname;

  // 🔒 1) API + routes privées : réseau uniquement, jamais intercepté
  if (isNetworkOnly(path)) return;

  // ⚡ 2) Assets statiques : cache-first + revalidation + limite 80
  if (isStaticAsset(path)) {
    e.respondWith(
      caches.open(ASSETS_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res.ok) {
              cache.put(req, res.clone()).then(() => trimCache(ASSETS_CACHE, ASSET_LIMIT));
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // 🌐 3) Navigation HTML vers une page publique : network-first + fallback propre
  if (isNavigation(req) && isPublicPage(path)) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches
              .open(PAGES_CACHE)
              .then((cache) => cache.put(path, clone))
              .then(() => trimCache(PAGES_CACHE, PAGE_LIMIT));
          }
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(PAGES_CACHE);
          const cached = await cache.match(path);
          return cached || offlineResponse();
        })
    );
    return;
  }

  // 4) Tout le reste (pages hors liste blanche, requêtes non-HTML) : réseau normal
});
/* ===== PUSH WEB (v5) : notifications même site fermé ===== */
self.addEventListener("push", function (event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) {}
  var title = data.title || "Kimoxa";
  var options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: "kimoxa-" + (data.type || "notif"),
    renotify: true,
    data: { link: data.link || "/" }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var link = (event.notification.data && event.notification.data.link) || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (wins) {
      for (var i = 0; i < wins.length; i++) {
        var w = wins[i];
        if ("focus" in w) {
          w.focus();
          if ("navigate" in w) { w.navigate(link); }
          return;
        }
      }
      return clients.openWindow(link);
    })
  );
});
