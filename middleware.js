// Middleware Edge — protège les routes sensibles.
// Vérifie le JWT httpOnly et injecte l'utilisateur vérifié dans les headers.
// Les routes buyer (orders, addresses, favorites) sont restreintes aux acheteurs
// pour empêcher un vendeur d'accéder à des commandes qui ne le concernent pas.
import { NextResponse } from "next/server";
import { verifyToken, AUTH_COOKIE_NAME } from "./lib/auth";

// Message générique pour toutes les erreurs d'auth (ne révèle rien aux attaquants)
const AUTH_ERROR = { error: "Accès refusé." };

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  const isVendorRoute = pathname.startsWith("/api/vendor");
  const isAdminRoute = pathname.startsWith("/api/admin");
  const isOrdersRoute = pathname.startsWith("/api/orders");
  const isProductsRoute = pathname.startsWith("/api/products");
  const isAddressesRoute = pathname.startsWith("/api/addresses");
  const isConversationsRoute = pathname.startsWith("/api/conversations");
  const isFavoritesRoute = pathname.startsWith("/api/favorites");

  // Routes publiques non concernées : laisser passer sans auth
  if (
    !isVendorRoute &&
    !isAdminRoute &&
    !isOrdersRoute &&
    !isProductsRoute &&
    !isAddressesRoute &&
    !isConversationsRoute &&
    !isFavoritesRoute
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  // 🌐 Catalogue : public, mais on attache l'utilisateur si connecté
  if (isProductsRoute) {
    if (!token) return NextResponse.next();
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.next(); // token invalide mais catalogue = OK
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", String(payload.userId));
    requestHeaders.set("x-user-role", String(payload.role));
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // 🔒 Toutes les autres routes : authentification obligatoire
  if (!token) {
    return NextResponse.json(AUTH_ERROR, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json(AUTH_ERROR, { status: 401 });
  }

  // 🛡️ Vérifications de rôle strictes
  if (isAdminRoute && payload.role !== "admin") {
    return NextResponse.json(AUTH_ERROR, { status: 403 });
  }

  if (isVendorRoute && payload.role !== "vendor" && payload.role !== "admin") {
    return NextResponse.json(AUTH_ERROR, { status: 403 });
  }

  // 🛒 Routes acheteur : bloquer vendeurs et admins non-admin
  // (un vendeur ne doit pas pouvoir lister les commandes des acheteurs)
  const isBuyerOnly = isOrdersRoute || isAddressesRoute || isFavoritesRoute;
  if (isBuyerOnly && payload.role !== "buyer" && payload.role !== "admin") {
    return NextResponse.json(AUTH_ERROR, { status: 403 });
  }

  // 💬 Conversations : accessibles à tous les rôles (acheteur ET vendeur discutent)
  // isConversationsRoute passe simplement

  // ✅ Headers vérifiés injectés pour les routes
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", String(payload.userId));
  requestHeaders.set("x-user-role", String(payload.role));

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/api/vendor/:path*",
    "/api/admin/:path*",
    "/api/orders/:path*",
    "/api/products/:path*",
    "/api/addresses/:path*",
    "/api/conversations/:path*",
    "/api/favorites/:path*",
  ],
};
