import sql from "@/lib/db";

// Liste publique des boutiques actives, pour le filtre du catalogue.
export async function getActiveShops() {
  return sql`
    SELECT id, name FROM shops WHERE status = 'active' ORDER BY name
  `;
}

// Villes distinctes des boutiques actives, pour le filtre catalogue.
export async function getShopCities() {
  const rows = await sql`
    SELECT DISTINCT city
    FROM shops
    WHERE status = 'active' AND city IS NOT NULL AND city != ''
    ORDER BY city ASC
  `;
  return rows.map((r) => r.city);
}
