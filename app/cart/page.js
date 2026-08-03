import { getCurrentUser } from "@/lib/session";
import { getCategoriesTree } from "@/lib/queries/categories";
import CartClient from "@/app/cart/CartClient";

export const metadata = {
  title: "Mon panier",
};

export default async function CartPage() {
  const [user, categories] = await Promise.all([getCurrentUser(), getCategoriesTree()]);
  return <CartClient initialUser={user} categories={categories} />;
}
