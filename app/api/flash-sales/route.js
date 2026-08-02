import { getActiveFlashSales } from "@/lib/queries/flashSales";

// GET /api/flash-sales
// Renvoie les produits actuellement en vente flash (date de fin non dépassée),
// triés par fin la plus proche en premier, limité à 8 produits.
export async function GET() {
  const products = await getActiveFlashSales();
  return Response.json({ products });
}
