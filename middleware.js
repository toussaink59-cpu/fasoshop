// Middleware Node.js — protège les routes sensibles.
//
// Vérifie le JWT httpOnly ET le statut EN TEMPS RÉEL via la base de données.
//
// Une suspension est donc effective IMMÉDIATEMENT, même avec un ancien cookie.
//
// Important : ce middleware utilise lib/auth -> lib/db -> postgres.js.
// Il doit donc fonctionner sur le runtime Node.js et non Edge.

import { NextResponse } from "next/server";

import { verifyToken, AUTH_COOKIE_NAME } from "./lib/auth";

const AUTH_ERROR = { error: "Accès refusé." };

const KYC_ERROR = {
  error: "Activez votre boutique avant d'accéder à cette page.",
};

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
  const isCartRoute = pathname.startsWith("/api/cart");
  const isPromosRoute = pathname.startsWith("/api/promos");
  const isAccountRoute = pathname.startsWith("/api/account");

  // Routes non concernées par le middleware d'authentification.
  if (
    !isVendorRoute &&
    !isAdminRoute &&
    !isOrdersRoute &&
    !isProductsRoute &&
    !isAddressesRoute &&
    !isConversationsRoute &&
    !isFavoritesRoute &&
    !isCartRoute &&
    !isPromosRoute &&
    !isAccountRoute
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  // 🔒 Les headers d'identité fournis par le client ne sont jamais fiables.
  // On les supprime avant de continuer et on les reconstruit uniquement
  // depuis le JWT vérifié.
  const cleanHeaders = new Headers(request.headers);

  cleanHeaders.delete("x-user-id");
  cleanHeaders.delete("x-user-role");

  // Catalogue produits :
  // route publique, mais attache l'utilisateur si un JWT valide existe.
  if (isProductsRoute) {
    if (!token) {
      return NextResponse.next({
        request: { headers: cleanHeaders },
      });
    }

    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.next({
        request: { headers: cleanHeaders },
      });
    }

    cleanHeaders.set("x-user-id", String(payload.userId));
    cleanHeaders.set("x-user-role", String(payload.role));

    return NextResponse.next({
      request: { headers: cleanHeaders },
    });
  }

  // Authentification obligatoire.
  if (!token) {
    return NextResponse.json(AUTH_ERROR, { status: 401 });
  }

  const payload = await verifyToken(token);

  if (!payload) {
    return NextResponse.json(AUTH_ERROR, { status: 401 });
  }

  // Pré-vérification rapide depuis le JWT.
  if (payload.status === "suspended") {
    return NextResponse.json(AUTH_ERROR, { status: 403 });
  }

  // Rôles stricts.
  if (isAdminRoute && payload.role !== "admin") {
    return NextResponse.json(AUTH_ERROR, { status: 403 });
  }

  if (
    isVendorRoute &&
    payload.role !== "vendor" &&
    payload.role !== "admin"
  ) {
    return NextResponse.json(AUTH_ERROR, { status: 403 });
  }

  // Vérification temps réel en base.
  // Cela rend les suspensions et invalidations de session effectives
  // immédiatement, même avec un ancien JWT.
  const uid = encodeURIComponent(payload.userId);
  const tv = encodeURIComponent(payload.tokenVersion ?? 0);

  const checkRes = await fetch(
    new URL(
      `/api/internal/session-status?uid=${uid}&tv=${tv}`,
      request.url
    ),
    {
      headers: {
        "x-internal-secret":
          process.env.INTERNAL_STATUS_SECRET || "",
      },
      cache: "no-store",
    }
  );

  const st = checkRes.ok
    ? await checkRes.json().catch(() => null)
    : null;

  if (!st) {
    return NextResponse.json(AUTH_ERROR, { status: 403 });
  }

  // Session invalidée par un reset de mot de passe ou rotation
  // de la version du token.
  if (
    Number(payload.tokenVersion || 0) !==
    Number(st.token_version || 0)
  ) {
    return NextResponse.json(AUTH_ERROR, { status: 401 });
  }

  // Compte utilisateur suspendu → blocage immédiat.
  if (st.user_status === "suspended") {
    return NextResponse.json(AUTH_ERROR, { status: 403 });
  }

  // Boutique non active → blocage.
  // Exception :
  // le vendeur peut consulter/modifier son propre dossier boutique
  // pour effectuer son KYC.
  if (isVendorRoute && payload.role === "vendor") {
    const isKycAllowed =
      pathname === "/api/vendor/shop" &&
      (method === "GET" || method === "PATCH");

    if (!isKycAllowed && st.shop_status !== "active") {
      return NextResponse.json(KYC_ERROR, { status: 403 });
    }
  }

  // Routes réservées aux acheteurs.
  const isBuyerOnly =
    isOrdersRoute ||
    isAddressesRoute ||
    isFavoritesRoute ||
    isCartRoute ||
    isPromosRoute ||
    isAccountRoute;

  if (
    isBuyerOnly &&
    payload.role !== "buyer" &&
    payload.role !== "admin"
  ) {
    return NextResponse.json(AUTH_ERROR, { status: 403 });
  }

  // Headers d'identité vérifiés :
  // ils proviennent exclusivement du JWT validé.
  cleanHeaders.set("x-user-id", String(payload.userId));
  cleanHeaders.set("x-user-role", String(payload.role));

  return NextResponse.next({
    request: {
      headers: cleanHeaders,
    },
  });
}

export const config = {
  // ✅ Important :
  // le middleware importe lib/auth -> lib/db -> postgres.js,
  // donc il doit utiliser le runtime Node.js.
  runtime: "nodejs",

  matcher: [
    "/api/vendor/:path*",
    "/api/admin/:path*",
    "/api/orders/:path*",
    "/api/products/:path*",
    "/api/addresses/:path*",
    "/api/conversations/:path*",
    "/api/favorites/:path*",
    "/api/cart/:path*",
    "/api/promos/:path*",
    "/api/account/:path*",
  ],
};