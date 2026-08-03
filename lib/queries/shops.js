import sql from "@/lib/db";

// Liste publique des boutiques actives, pour le filtre du catalogue.
export async function getActiveShops() {
  return sql`
    SELECT id, name FROM shops WHERE status = 'active' ORDER BY name
  `;
}

// Boutiques actives avec note moyenne et nombre de produits, pour la page
// publique "Nos vendeurs".
export async function getShopsDirectory() {
  return sql`
    SELECT s.id, s.name, u.full_name AS vendor_name,
           COUNT(DISTINCT p.id) AS product_count,
           COALESCE(AVG(r.rating), 0)::numeric(2,1) AS avg_rating,
           COUNT(DISTINCT r.id) AS review_count
    FROM shops s
    JOIN users u ON u.id = s.vendor_id
    LEFT JOIN products p ON p.shop_id = s.id
    LEFT JOIN reviews r ON r.product_id = p.id
    WHERE s.status = 'active'
    GROUP BY s.id, s.name, u.full_name
    ORDER BY avg_rating DESC, product_count DESC
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
