import sql from "@/lib/db";
import { adminGuard } from "@/lib/adminAuth";

// GET /api/admin/sponsorships
// Liste les demandes de sponsoring (par défaut toutes, triées par date).
export async function GET(request) {
  const guardError = await adminGuard(request);
  if (guardError) return guardError;

  const requests = await sql`
    SELECT sr.id, sr.status, sr.requested_at, sr.reviewed_at, sr.admin_notes,
           p.id AS product_id, p.name AS product_name, p.price,
           s.name AS shop_name, u.full_name AS vendor_name
    FROM sponsorship_requests sr
    JOIN products p ON p.id = sr.product_id
    JOIN shops s ON s.id = sr.shop_id
    JOIN users u ON u.id = s.vendor_id
    ORDER BY
      CASE sr.status WHEN 'pending' THEN 0 ELSE 1 END,
      sr.requested_at DESC
  `;
  return Response.json({ requests });
}
