import { verifyToken, AUTH_COOKIE_NAME } from "@/lib/auth";

// Defense en profondeur (V-02) : verifie le JWT LUI-MEME, independamment
// du matcher middleware. Meme si la ligne /api/admin disparait du matcher,
// un header x-user-role forge ne suffit pas : il faut un cookie admin valide.
export async function adminGuard(request) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload || payload.role !== "admin") {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }
  return null;
}
