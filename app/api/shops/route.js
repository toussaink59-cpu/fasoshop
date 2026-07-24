import sql from "@/lib/db";

// GET /api/shops
// Liste publique des boutiques actives, pour le filtre du catalogue.
export async function GET() {
  const shops = await sql`
    SELECT id, name FROM shops WHERE status = 'active' ORDER BY name
  `;
  return Response.json({ shops });
}
