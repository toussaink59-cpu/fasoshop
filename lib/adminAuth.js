/**
 * 🔒 Défense en profondeur (V-02) — le rôle admin est déjà vérifié par
 * middleware.js pour tout ce qui matche "/api/admin/:path*", mais cette
 * garantie repose sur UNE seule ligne de configuration (le matcher). Si
 * cette ligne disparaît un jour par erreur — exactement comme cela est
 * arrivé avec /api/cart/sync (voir V-01) — plus aucune route admin ne
 * serait protégée, silencieusement.
 *
 * Ce helper ajoute une seconde couche indépendante : chaque handler admin
 * revérifie lui-même x-user-role, qui ne peut légitimement valoir "admin"
 * que si le middleware a fait son travail (sinon l'en-tête est absent).
 */
export function adminGuard(request) {
  if (request.headers.get("x-user-role") !== "admin") {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }
  return null;
}
