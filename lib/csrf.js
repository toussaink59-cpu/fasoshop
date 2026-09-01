// Protection CSRF : les navigateurs envoient toujours un en-tête Origin
// sur les POST cross-site. On rejette tout Origin different du notre.
// Les clients non-navigateur (e2e, curl) sans Origin restent acceptes :
// les cookies SameSite=Lax constituent deja la protection de base.
export function sameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
