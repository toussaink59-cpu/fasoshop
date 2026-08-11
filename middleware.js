// Middleware Edge — protège les routes sensibles.
// Vérifie le JWT httpOnly ET le statut de l'utilisateur/boutique.
// Bloque : comptes suspendus, vendors rejected/suspended.
// Exception : vendors pending/rejected peuvent PATCH /api/vendor/shop pour soumettre KYC.

import { NextResponse } from "next/server";
import { verifyToken, AUTH_COOKIE_NAME } from "./lib/auth";

const AUTH_ERROR = { error: "Accès refusé." };
const KYC_ERROR = { error: "Activez votre boutique avant d'accéder à cette page." };

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const method = request.method; // GET, POST, PATCH, DELETE...

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

  // 🌐 Catalogue produits : public, attache l'utilisateur si connecté
  if (isProductsRoute) {
    if (!token) return NextResponse.next();
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.next();
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

  // 🔒 BLOCAGE global : compte utilisateur suspendu
  if (payload.status === "suspended") {
    return NextResponse.json(AUTH_ERROR, { status: 403 });
  }

  // 🔒 Vérifications de rôle strictes
  if (isAdminRoute && payload.role !== "admin") {
    return NextResponse.json(AUTH_ERROR, { status: 403 });
  }

  if (isVendorRoute && payload.role !== "vendor" && payload.role !== "admin") {
    return NextResponse.json(AUTH_ERROR, { status: 403 });
  }

  // 🏪 Vendors : vérification statut boutique
  if (isVendorRoute && payload.role === "vendor") {
    // Exception KYC : PATCH /api/vendor/shop reste ouvert aux pending/rejected
    const isKycPatch = pathname === "/api/vendor/shop" && method === "PATCH";
    const shopStatus = payload.shopStatus || "pending";

    if (!isKycPatch) {
      if (shopStatus === "suspended") {
        return NextResponse.json(KYC_ERROR, { status: 403 });
      }
      if (shopStatus === "rejected") {
        return NextResponse.json(KYC_ERROR, { status: 403 });
      }
      if (shopStatus === "pending") {
        return NextResponse.json(KYC_ERROR, { status: 403 });
      }
      // shopStatus === "active" → OK, on continue
    }
  }

  // 🛒 Routes acheteur : bloquer vendeurs et admins non-admin
  const isBuyerOnly = isOrdersRoute || isAddressesRoute || isFavoritesRoute;
  if (isBuyerOnly && payload.role !== "buyer" && payload.role !== "admin") {
    return NextResponse.json(AUTH_ERROR, { status: 403 });
  }

  // 💬 Conversations : accessibles à tous les rôles (acheteur ET vendeur discutent)

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
