import { getActiveShops } from "@/lib/queries/shops";

// GET /api/shops
// Liste publique des boutiques actives, pour le filtre du catalogue.
export async function GET() {
  const shops = await getActiveShops();
  return Response.json({ shops });
}
