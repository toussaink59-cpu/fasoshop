import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getCategoriesTree } from "@/lib/queries/categories";
import { getFavoriteProducts } from "@/lib/queries/favorites";
import FavorisClient from "@/app/favoris/FavorisClient";

export const metadata = {
  title: "Mes favoris",
};

export default async function FavorisPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [categories, products] = await Promise.all([
    getCategoriesTree(),
    getFavoriteProducts(user.id),
  ]);

  return <FavorisClient initialUser={user} categories={categories} initialProducts={products} />;
}
