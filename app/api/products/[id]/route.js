import { getProductDetail } from "@/lib/queries/productDetail";

// GET /api/products/[id]
export async function GET(request, { params }) {
  const { id } = await params;
  const product = await getProductDetail(id);

  if (!product) {
    return Response.json({ error: "Produit introuvable." }, { status: 404 });
  }

  return Response.json({ product });
}
