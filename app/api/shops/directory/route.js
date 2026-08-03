import { getShopsDirectory } from "@/lib/queries/shops";

// GET /api/shops/directory
// Liste les boutiques actives (vérifiées) avec leur note moyenne et leur
// nombre de produits, pour la page publique "Nos vendeurs".
export async function GET() {
  const shops = await getShopsDirectory();
  return Response.json({ shops });
}
