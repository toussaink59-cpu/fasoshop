import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { signToken, AUTH_COOKIE_NAME } from "@/lib/auth";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.NEXT_PUBLIC_SITE_URL
  ? process.env.NEXT_PUBLIC_SITE_URL + "/api/auth/google/callback"
  : "http://localhost:3000/api/auth/google/callback";

async function exchangeCodeForUser(code) {
  // 1. Échanger code contre tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) throw new Error("Echange code échoué");
  const { access_token } = await tokenRes.json();

  // 2. Récupérer profil utilisateur
  const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: "Bearer " + access_token },
  });
  if (!userRes.ok) throw new Error("Récupération profil échouée");
  return await userRes.json();
}

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/login?error=google_denied", request.url));
  }

  try {
    const g = await exchangeCodeForUser(code);
    if (!g.email || !g.sub) throw new Error("Email Google manquant");

    // Chercher user par email
    let [user] = await sql`SELECT * FROM users WHERE email = ${g.email}`;

    if (user) {
      // Lier compte Google si pas encore fait
      if (!user.google_id) {
        await sql`UPDATE users SET google_id = ${g.sub}, google_picture = ${g.picture || null}, provider = COALESCE(provider, 'local') WHERE id = ${user.id}`;
        user.google_id = g.sub;
        user.google_picture = g.picture;
      }
    } else {
      // Créer nouveau compte (buyer par défaut)
      const name = g.name || g.email.split("@")[0];
      [user] = await sql`
        INSERT INTO users (email, full_name, google_id, google_picture, provider, role, status, token_version)
        VALUES (${g.email}, ${name}, ${g.sub}, ${g.picture || null}, 'google', 'buyer', 'active', 0)
        RETURNING *
      `;
    }

    // Enrichir payload JWT (comme /api/auth/login)
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.token_version,
    };
    if (user.role === "vendor") {
      const [shop] = await sql`SELECT id, status FROM shops WHERE vendor_id = ${user.id}`;
      if (shop) {
        tokenPayload.shopId = shop.id;
        tokenPayload.shopStatus = shop.status;
      }
    }

    const token = await signToken(tokenPayload);
    const redirectPath =
      user.role === "admin" ? "/admin/dashboard" :
      user.role === "vendor" ? "/vendor/dashboard" : "/";

    const response = NextResponse.redirect(new URL(redirectPath, request.url));
    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });
    return response;
  } catch (err) {
    console.error("Google callback error:", err);
    return NextResponse.redirect(new URL("/login?error=google_failed", request.url));
  }
}
