import sql from "@/lib/db";

// GET /api/shops/cities
// Liste les villes distinctes des boutiques actives, pour le filtre catalogue.
export async function GET() {
  const rows = await sql`
    SELECT DISTINCT city
    FROM shops
    WHERE status = 'active' AND city IS NOT NULL AND city != ''
    ORDER BY city ASC
  `;
  return Response.json({ cities: rows.map((r) => r.city) });
}
