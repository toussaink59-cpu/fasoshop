import sql from "@/lib/db";

// Force dynamic rendering (avoid DB timeout during build)
export const dynamic = 'force-dynamic';


// Sitemap dynamique : produits + boutiques actifs uniquement
export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://fasoshop-xi.vercel.app";

  const [products, shops] = await Promise.all([
    sql`SELECT id FROM products WHERE status = 'active' AND stock_quantity > 0`,
    sql`SELECT id FROM shops WHERE status = 'active'`,
  ]);

  return [
    { url: `${baseUrl}/`, changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/shop`, changeFrequency: "daily", priority: 0.9 },
    ...shops.map((s) => ({
      url: `${baseUrl}/boutique/${s.id}`,
      changeFrequency: "weekly",
      priority: 0.7,
    })),
    ...products.map((p) => ({
      url: `${baseUrl}/shop/${p.id}`,
      changeFrequency: "weekly",
      priority: 0.6,
    })),
  ];
}