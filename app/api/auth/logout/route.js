import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";

// POST /api/auth/logout
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.headers.set(
    "Set-Cookie",
    `${AUTH_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`
  );
  return response;
}
