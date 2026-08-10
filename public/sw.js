/* Service Worker Kimoxa — cache intelligent + mode hors-ligne léger */
const CACHE = "kimoxa-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;

  // Jamais de cache pour les appels API : ce sont souvent des données
  // personnelles (commandes, revenus, favoris, session...). Les stocker
  // dans le Cache Storage les laisserait accessibles sur l'appareil même
  // après déconnexion. Réseau uniquement, aucun fallback hors-ligne ici —
  // une erreur réseau doit remonter normalement, pas servir de données
  // périmées ou celles d'un autre utilisateur.
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png");

  if (isStatic) {
    // Statique : cache d'abord, réseau en secours
    e.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(e.request);
        const network = fetch(e.request)
          .then((res) => {
            if (res.ok) cache.put(e.request, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  } else {
    // Pages : réseau d'abord, cache en secours (hors-ligne) — mais jamais
    // si le serveur marque la réponse comme privée/non-cachable (pages
    // authentifiées : commandes, dashboards vendeur/admin...). Sur un
    // appareil partagé, mettre ces pages en cache pourrait montrer les
    // données d'un utilisateur à un autre après déconnexion.
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const cacheControl = res.headers.get("cache-control") || "";
          const isPrivate = cacheControl.includes("no-store") || cacheControl.includes("private");
          if (res.ok && !isPrivate) {
            const clone = res.clone();
            caches.open(CACHE).then((cache) => cache.put(e.request, clone));
          }
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(e.request);
          return cached || (await caches.match("/"));
        })
    );
  }
});
