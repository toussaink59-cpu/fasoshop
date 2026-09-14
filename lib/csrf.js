// Protection CSRF : les navigateurs envoient toujours un en-tête Origin
// sur les POST cross-site. On rejette tout Origin different du notre.
//
// Durcissement (audit 2026-09-12) : en plus d'Origin, on exploite
// Sec-Fetch-Site — envoyé par TOUS les navigateurs modernes (Chrome,
// Edge, Firefox, Safari) sur chaque requête. Un POST cross-site reçoit
// "cross-site" même quand le navigateur omet Origin (certaines
// navigations/redirections). Sans ces deux en-têtes (curl, tests e2e),
// le comportement historique est conservé : accepté, protégé par le
// cookie SameSite=Lax posé à la connexion.
export function sameOrigin(request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return false;

  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}