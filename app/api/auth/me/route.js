import sql from "@/lib/db";
import { verifyToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return Response.json({ user: null }, { status: 200 });
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return Response.json({ user: null }, { status: 200 });
  }

  const [user] = await sql`
    SELECT id, email, full_name, role FROM users WHERE id = ${payload.userId}
  `;

  return Response.json({ user: user || null });
}
