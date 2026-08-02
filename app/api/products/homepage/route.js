import { getHomepageProducts } from "@/lib/queries/homepage";

// GET /api/products/homepage
// Renvoie les produits les plus vendus (bestSellers) et les plus récents
// (newArrivals), uniquement des boutiques actives (vérifiées), avec la note
// moyenne de la boutique.
export async function GET() {
  const { bestSellers, newArrivals } = await getHomepageProducts();
  return Response.json({ bestSellers, newArrivals });
}
