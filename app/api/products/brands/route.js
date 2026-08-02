import { getBrands } from "@/lib/queries/products";

// GET /api/products/brands
// Liste les marques distinctes utilisées par des produits actifs, pour le filtre.
export async function GET() {
  return Response.json({ brands: await getBrands() });
}
