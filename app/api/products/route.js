import { getProducts } from "@/lib/queries/products";

// GET /api/products
// Catalogue public — uniquement les produits actifs et en stock.
// Filtres : ?category=slug &q=texte &minPrice=N &maxPrice=N &shopId=N
//           &condition=neuf|quasi_neuf|occasion &brand=texte &city=texte &minRating=1-5
// Tri : ?sort=newest|price_asc|price_desc|rating (défaut : newest)
// Les produits sponsorisés actifs remontent toujours en tête de liste.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = request.headers.get("x-user-id");

  const filters = {
    categorySlug: searchParams.get("category"),
    q: searchParams.get("q"),
    minPrice: searchParams.get("minPrice"),
    maxPrice: searchParams.get("maxPrice"),
    shopId: searchParams.get("shopId"),
    condition: searchParams.get("condition"),
    brand: searchParams.get("brand"),
    city: searchParams.get("city"),
    minRating: searchParams.get("minRating"),
    sort: searchParams.get("sort") || "newest",
  };

  const products = await getProducts(filters, userId);
  return Response.json({ products, total: products.length });
}
