import sql from "@/lib/db";
import { getVendorEarnings } from "@/lib/queries/earnings";

export async function GET(request) {
  const userId = request.headers.get("x-user-id");
  const [user] = await sql`SELECT role FROM users WHERE id = ${userId}`;
  if (!user || (user.role !== "vendor" && user.role !== "admin")) {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }

  const [shop] = await sql`SELECT id FROM shops WHERE vendor_id = ${userId}`;
  if (!shop) {
    return Response.json({ earnings: { held_amount: 0, released_amount: 0, paid_amount: 0, held_count: 0, released_count: 0, paid_count: 0, total_gross: 0, total_commission: 0 } });
  }

  const earnings = await getVendorEarnings(shop.id);
  return Response.json({ earnings });
}
