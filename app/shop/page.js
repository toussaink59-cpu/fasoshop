import { getProducts, getBrands } from "@/lib/queries/products";
import { getActiveShops, getShopCities } from "@/lib/queries/shops";
import { getCategoriesTree } from "@/lib/queries/categories";
import { getCurrentUser } from "@/lib/session";
import ShopClient from "@/app/shop/ShopClient";

// Next.js 15 : searchParams est une Promise dans les Server Components.
export async function generateMetadata({ searchParams }) {
  const sp = await searchParams;
  const q = sp?.q;
  const category = sp?.category;

  if (q) {
    return {
      title: `Résultats pour "${q}"`,
      description: `Produits correspondant à "${q}" sur le catalogue FasoShop.`,
    };
  }
  if (category) {
    return {
      title: `Catégorie : ${category}`,
      description: `Découvrez les produits de la catégorie ${category} sur FasoShop.`,
    };
  }
  return {
    title: "Catalogue",
    description: "Parcourez tous les produits disponibles sur FasoShop, toutes boutiques confondues.",
  };
}

// Server Component : le premier rendu contient déjà les produits correspondant
// aux filtres présents dans l'URL (SSR), les filtres/tri restant ensuite gérés
// côté client (ShopClient) exactement comme avant.
export default async function ShopPage({ searchParams }) {
  const sp = await searchParams;

  const filters = {
    categorySlug: sp?.category || null,
    q: sp?.q || null,
    minPrice: sp?.minPrice || null,
    maxPrice: sp?.maxPrice || null,
    shopId: sp?.shopId || null,
    condition: sp?.condition || null,
    brand: sp?.brand || null,
    city: sp?.city || null,
    minRating: sp?.minRating || null,
    sort: sp?.sort || "newest",
  };

  const user = await getCurrentUser();

  const [productResult, shops, categories, brands, cities] = await Promise.all([
    getProducts(filters, user?.id ?? null),
    getActiveShops(),
    getCategoriesTree(),
    getBrands(),
    getShopCities(),
  ]);

  // getProducts retourne maintenant { products, nextCursor, hasMore, total }
  // On extrait le tableau products pour ShopClient
  const products = productResult.products;

  return (
    <ShopClient
      initialProducts={products}
      initialShops={shops}
      initialCategories={categories}
      initialBrands={brands}
      initialCities={cities}
      initialUser={user}
    />
  );
}
