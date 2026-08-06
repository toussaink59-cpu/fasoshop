import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getCategoriesTree } from "@/lib/queries/categories";
import AccountClient from "@/app/account/AccountClient";

export const metadata = { title: "Mon compte" };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const categories = await getCategoriesTree();

  return <AccountClient initialUser={user} categories={categories} />;
}
