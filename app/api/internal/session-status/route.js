import sql from "@/lib/db";

// GET /api/internal/session-status?uid=123
// 🔒 Réservé au middleware (secret partagé). Ne jamais exposer publiquement.
export async function GET(request) {
  const secret = request.headers.get("x-internal-secret");
  if (!secret || secret !== process.env.INTERNAL_STATUS_SECRET) {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }

  const uid = Number(new URL(request.url).searchParams.get("uid"));
  if (!Number.isInteger(uid) || uid <= 0) {
    return Response.json({ error: "uid invalide." }, { status: 400 });
  }

  const [row] = await sql`
    SELECT u.status AS user_status, s.status AS shop_status
    FROM users u
    LEFT JOIN shops s ON s.vendor_id = u.id
    WHERE u.id = ${uid}
  `;

  return Response.json(row || { user_status: null, shop_status: null });
}
