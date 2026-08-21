// Helper Server-only : récupère l'utilisateur connecté à partir du cookie JWT.
// Utilisable à la fois dans les Server Components (app/page.js, app/shop/page.js...)
// et dans les API routes (ex: /api/auth/me), pour éviter de dupliquer la logique
// de vérification de session à deux endroits.
import { cookies } from "next/headers";
import sql from "@/lib/db";
import { verifyToken, AUTH_COOKIE_NAME } from "@/lib/auth";

/**
 * Récupère l'utilisateur connecté depuis le cookie JWT.
 * 
 * SÉCURITÉ : retourne null si le compte est suspendu,
 * même si le JWT est valide. Cela garantit qu'un admin peut
 * suspendre un compte et que la suspension prend effet immédiatement
 * sur toutes les pages (pas seulement les API).
 * 
 * @returns {Promise<{id, email, full_name, role, status}|null>}
 */
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

 // CORRECTION : vérifier le statut en base (pas seulement dans le JWT)
  // Un compte suspendu retourne null = considéré déconnecté
  const [user] = await sql`
    SELECT id, email, full_name, role, status
    FROM users
    WHERE id = ${payload.userId}
      AND status <> 'suspended'
  `;
  return user || null;
}
