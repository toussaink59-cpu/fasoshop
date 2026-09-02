import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const REDIRECT_URI = process.env.NEXT_PUBLIC_SITE_URL
  ? process.env.NEXT_PUBLIC_SITE_URL + "/api/auth/google/callback"
  : "http://localhost:3000/api/auth/google/callback";

// P0-04 (audit) : state OAuth cryptographique + stockage cookie pour verification CSRF
const STATE_COOKIE = "oauth_state";

export async function GET(request) {
  if (!GOOGLE_CLIENT_ID) {
    return NextResponse.json({ error: "Google OAuth non configuré." }, { status: 500 });
  }
  
  // State cryptographique (32 bytes = 64 hex)
  const state = randomBytes(32).toString("hex");
  
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
    state,
  });
  
  const url = "https://accounts.google.com/o/oauth2/v2/auth?" + params.toString();
  const response = NextResponse.redirect(url);
  
  // Stocker state dans cookie httpOnly (10 min expiration)
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });
  
  return response;
}
