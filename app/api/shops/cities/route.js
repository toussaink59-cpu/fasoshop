import { getShopCities } from "@/lib/queries/shops";

// GET /api/shops/cities
// Liste les villes distinctes des boutiques actives, pour le filtre catalogue.
export async function GET() {
  return Response.json({ cities: await getShopCities() });
}
