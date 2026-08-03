import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getCategoriesTree } from "@/lib/queries/categories";
import { getBuyerOrders } from "@/lib/queries/orders";
import OrdersClient from "@/app/orders/OrdersClient";

export const metadata = {
  title: "Mes commandes",
};

export default async function OrdersPage({ searchParams }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const [categories, orders] = await Promise.all([
    getCategoriesTree(),
    getBuyerOrders(user.id),
  ]);

  return (
    <OrdersClient
      initialUser={user}
      categories={categories}
      initialOrders={orders}
      confirmedId={sp?.confirmed || null}
      confirmedMethod={sp?.method || null}
    />
  );
}
