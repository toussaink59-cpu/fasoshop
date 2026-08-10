/* =====================================================
   SERVICE WORKER KIMOXA v3 — architecture de cache sécurisée
   ─ /api/* + pages privées  : réseau uniquement 🔒 (jamais de cache)
   ─ /_next/static, /icons, images : cache ⚡ (cache-first)
   ─ pages publiques : réseau + fallback hors-ligne 🌐
===================================================== */
const CACHE = "kimoxa-v3";

// 🔒 Réseau uniquement : aucune donnée sensible ne doit être mise en cache
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

// ⚡ Cache : fichiers statiques immuables (hashés par Next.js)
const STATIC_PREFIXES = ["/_next/static/", "/icons/"];
const STATIC_EXT = [".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".woff", ".woff2", ".webmanifest"];

const isNetworkOnly = (path) =>
  NETWORK_ONLY.some((p) => path === p || path.startsWith(p + "/"));

const isStatic = (path) =>
  STATIC_PREFIXES.some((p) => path.startsWith(p)) ||
  STATIC_EXT.some((ext) => path.endsWith(ext));

self.addEventListener("install", () => {
  self.skipWaiting();
});

// Purge automatiquement les anciens caches (v1, v2…) à l'activation
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  const path = url.pathname;

  // 🔒 1) API + pages privées → réseau uniquement, on ne touche à rien
  if (isNetworkOnly(path)) return;

  // ⚡ 2) Statique → cache d'abord, réseau en secours + revalidation
  if (isStatic(path)) {
    e.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // 🌐 3) Pages publiques → réseau d'abord, fallback hors-ligne
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, clone));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(req);
        return cached || (await caches.match("/"));
      })
  );
});
