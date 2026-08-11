// Middleware Edge — protège les routes sensibles.
// Vérifie le JWT httpOnly ET le statut EN TEMPS RÉEL via la base de données.
// Une suspension est donc effective IMMÉDIATEMENT, même avec un ancien cookie.
// Exception KYC : un vendor non actif peut LIRE (GET) et METTRE À JOUR (PATCH)
// son propre dossier boutique pour consulter son statut et corriger sa demande.

import { NextResponse } from "next/server";
import { verifyToken, AUTH_COOKIE_NAME } from "./lib/auth";

const AUTH_ERROR = { error: "Accès refusé." };
const KYC_ERROR = { error: "Activez votre boutique avant d'accéder à cette page." };

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  const isVendorRoute = pathname.startsWith("/api/vendor");
  const isAdminRoute = pathname.startsWith("/api/admin");
  const isOrdersRoute = pathname.startsWith("/api/orders");
  const isProductsRoute = pathname.startsWith("/api/products");
  const isAddressesRoute = pathname.startsWith("/api/addresses");
  const isConversationsRoute = pathname.startsWith("/api/conversations");
  const isFavoritesRoute = pathname.startsWith("/api/favorites");

  if (
    !isVendorRoute && !isAdminRoute && !isOrdersRoute && !isProductsRoute &&
    !isAddressesRoute && !isConversationsRoute && !isFavoritesRoute
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  // 🌐 Catalogue produits : public, attache l'utilisateur si connecté
  if (isProductsRoute) {
    if (!token) return NextResponse.next();
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.next();
    const h = new Headers(request.headers);
    h.set("x-user-id", String(payload.userId));
    h.set("x-user-role", String(payload.role));
    return NextResponse.next({ request: { headers: h } });
  }

  // 🔒 Authentification obligatoire
  if (!token) return NextResponse.json(AUTH_ERROR, { status: 401 });
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json(AUTH_ERROR, { status: 401 });

  // Pré-vérification rapide (JWT)
  if (payload.status === "suspended") return NextResponse.json(AUTH_ERROR, { status: 403 });

  // 🛡️ Rôles stricts
  if (isAdminRoute && payload.role !== "admin") return NextResponse.json(AUTH_ERROR, { status: 403 });
  if (isVendorRoute && payload.role !== "vendor" && payload.role !== "admin") return NextResponse.json(AUTH_ERROR, { status: 403 });

  // 🔄 VÉRIFICATION TEMPS RÉEL en base (rend les suspensions immédiates)
  const checkRes = await fetch(
    new URL(`/api/internal/session-status?uid=${encodeURIComponent(payload.userId)}`, request.url),
    { headers: { "x-internal-secret": process.env.INTERNAL_STATUS_SECRET || "" } }
  );
  const st = checkRes.ok ? await checkRes.json().catch(() => null) : null;
  if (!st) return NextResponse.json(AUTH_ERROR, { status: 403 }); // fail closed

  // Compte utilisateur suspendu → blocage immédiat (tous rôles)
  if (st.user_status === "suspended") return NextResponse.json(AUTH_ERROR, { status: 403 });

  // 🏪 Boutique non active → blocage, SAUF son propre dossier boutique (GET + PATCH KYC)
  if (isVendorRoute && payload.role === "vendor") {
    const isKycAllowed =
      pathname === "/api/vendor/shop" && (method === "GET" || method === "PATCH");
    if (!isKycAllowed && st.shop_status !== "active") {
      return NextResponse.json(KYC_ERROR, { status: 403 });
    }
  }

  // 🛒 Routes acheteur réservées
  const isBuyerOnly = isOrdersRoute || isAddressesRoute || isFavoritesRoute;
  if (isBuyerOnly && payload.role !== "buyer" && payload.role !== "admin") {
    return NextResponse.json(AUTH_ERROR, { status: 403 });
  }

  // ✅ Headers vérifiés injectés
  const h = new Headers(request.headers);
  h.set("x-user-id", String(payload.userId));
  h.set("x-user-role", String(payload.role));
  return NextResponse.next({ request: { headers: h } });
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
