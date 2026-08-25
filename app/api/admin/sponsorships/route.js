import sql from "@/lib/db";
import { adminGuard } from "@/lib/adminAuth";

// GET /api/admin/sponsorships
// Retourne toutes les demandes de sponsoring pour la modération.
export async function GET(request) {
  const guardError = await adminGuard(request);
  if (guardError) return guardError;

  try {
    const requests = await sql`
      SELECT
        sr.id,
        sr.product_id,
        sr.shop_id,
        sr.status,
        sr.duration_days,
        sr.price_fcfa,
        sr.admin_notes,
        sr.requested_at,
        sr.reviewed_at,
        p.name AS product_name,
        p.price AS product_price,
        s.name AS shop_name,
        u.full_name AS vendor_name
      FROM sponsorship_requests sr
      JOIN products p ON p.id = sr.product_id
      JOIN shops s ON s.id = sr.shop_id
      JOIN users u ON u.id = s.vendor_id
      ORDER BY sr.requested_at DESC
    `;
    return Response.json({ requests });
  } catch (err) {
    console.error("Erreur lecture demandes sponsoring:", err);
    return Response.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
