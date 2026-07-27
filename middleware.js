// Middleware Edge — protège les routes /api/vendor/*, /api/admin/*, /api/orders/*
// et /api/addresses/*. Vérifie le token JWT présent dans le cookie httpOnly et
// injecte l'utilisateur (id, role) dans les headers pour les API routes.
// /api/products/* est public (catalogue) mais reçoit quand même les infos
// utilisateur si connecté (nécessaire pour laisser un avis, par exemple).
import { NextResponse } from "next/server";
import { verifyToken, AUTH_COOKIE_NAME } from "./lib/auth";

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const isVendorRoute = pathname.startsWith("/api/vendor");
  const isAdminRoute = pathname.startsWith("/api/admin");
  const isOrdersRoute = pathname.startsWith("/api/orders");
  const isProductsRoute = pathname.startsWith("/api/products");
  const isAddressesRoute = pathname.startsWith("/api/addresses");

  if (!isVendorRoute && !isAdminRoute && !isOrdersRoute && !isProductsRoute && !isAddressesRoute) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    if (isProductsRoute) {
      // Catalogue public : on laisse passer sans utilisateur attaché
      return NextResponse.next();
    }
    return NextResponse.json(
      { error: "Non authentifié. Veuillez vous connecter." },
      { status: 401 }
    );
  }

  const payload = await verifyToken(token);

  if (!payload) {
    if (isProductsRoute) {
      return NextResponse.next();
    }
    return NextResponse.json(
      { error: "Session invalide ou expirée." },
      { status: 401 }
    );
  }

  if (isAdminRoute && payload.role !== "admin") {
    return NextResponse.json(
      { error: "Accès réservé à l'administrateur." },
      { status: 403 }
    );
  }

  if (isVendorRoute && payload.role !== "vendor" && payload.role !== "admin") {
    return NextResponse.json(
      { error: "Accès réservé aux vendeurs." },
      { status: 403 }
    );
  }

  // isOrdersRoute, isAddressesRoute : tout utilisateur connecté peut y accéder
  // isProductsRoute : public, mais on attache quand même l'utilisateur s'il est connecté
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", String(payload.userId));
  requestHeaders.set("x-user-role", String(payload.role));

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    "/api/vendor/:path*",
    "/api/admin/:path*",
    "/api/orders/:path*",
    "/api/products/:path*",
    "/api/addresses/:path*",
  ],
};
