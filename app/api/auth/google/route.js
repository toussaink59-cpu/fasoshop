import { NextResponse } from "next/server";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const REDIRECT_URI = process.env.NEXT_PUBLIC_SITE_URL
  ? process.env.NEXT_PUBLIC_SITE_URL + "/api/auth/google/callback"
  : "http://localhost:3000/api/auth/google/callback";

export async function GET(request) {
  if (!GOOGLE_CLIENT_ID) {
    return NextResponse.json({ error: "Google OAuth non configuré." }, { status: 500 });
  }
  const state = Math.random().toString(36).slice(2);
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
  return NextResponse.redirect(url);
}
