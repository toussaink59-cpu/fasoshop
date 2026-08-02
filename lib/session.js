// Helper Server-only : récupère l'utilisateur connecté à partir du cookie JWT.
// Utilisable à la fois dans les Server Components (app/page.js, app/shop/page.js...)
// et dans les API routes (ex: /api/auth/me), pour éviter de dupliquer la logique
// de vérification de session à deux endroits.
import { cookies } from "next/headers";
import sql from "@/lib/db";
import { verifyToken, AUTH_COOKIE_NAME } from "@/lib/auth";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const [user] = await sql`
    SELECT id, email, full_name, role FROM users WHERE id = ${payload.userId}
  `;
  return user || null;
}
