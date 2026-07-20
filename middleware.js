// Middleware Edge — protège les routes /api/vendor/* et /api/admin/*
// Vérifie le token JWT présent dans le cookie httpOnly et injecte
// l'utilisateur (id, role) dans les headers pour les API routes.

import { NextResponse } from "next/server";
import { verifyToken, AUTH_COOKIE_NAME } from "./lib/auth";

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  const isVendorRoute = pathname.startsWith("/api/vendor");
  const isAdminRoute = pathname.startsWith("/api/admin");
  const isOrdersRoute = pathname.startsWith("/api/orders");

  if (!isVendorRoute && !isAdminRoute && !isOrdersRoute) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json(
      { error: "Non authentifié. Veuillez vous connecter." },
      { status: 401 }
    );
  }

  const payload = await verifyToken(token);

  if (!payload) {
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

  // isOrdersRoute : tout utilisateur connecté peut passer commande (buyer, vendor, admin)

  // On transmet l'utilisateur authentifié aux API routes via un header
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", String(payload.userId));
  requestHeaders.set("x-user-role", String(payload.role));

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/api/vendor/:path*", "/api/admin/:path*", "/api/orders/:path*"],
};
