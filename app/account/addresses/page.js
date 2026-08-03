import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getCategoriesTree } from "@/lib/queries/categories";
import { getUserAddresses } from "@/lib/queries/addresses";
import AddressesClient from "@/app/account/addresses/AddressesClient";

export const metadata = {
  title: "Mes adresses",
};

export default async function AddressesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [categories, addresses] = await Promise.all([
    getCategoriesTree(),
    getUserAddresses(user.id),
  ]);

  return <AddressesClient initialUser={user} categories={categories} initialAddresses={addresses} />;
}
