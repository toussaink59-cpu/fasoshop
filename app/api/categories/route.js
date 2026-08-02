import { getCategoriesTree } from "@/lib/queries/categories";

// GET /api/categories
// Renvoie les catégories principales, chacune avec ses sous-catégories imbriquées.
export async function GET() {
  return Response.json({ categories: await getCategoriesTree() });
}
