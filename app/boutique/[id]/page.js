import { notFound } from "next/navigation";
import sql from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getPublicShop, getShopProducts } from "@/lib/queries/shopPublic";
import { storeJsonLd } from "@/lib/structuredData";
import ShopClient from "./ShopClient";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const shop = await getPublicShop(Number(id));
  if (!shop) return { title: "Boutique introuvable — Kimoxa" };
  return {
    title: `${shop.name} — Boutique officielle | Kimoxa`,
    description:
      shop.description ||
      `Découvrez les produits de ${shop.name} sur Kimoxa. Achetez local, vivez grand.`,
  };
}

export default async function BoutiquePage({ params }) {
  const { id } = await params;
  const shopId = Number(id);
  if (!Number.isInteger(shopId) || shopId <= 0) notFound();

  const [shop, products, user, categories] = await Promise.all([
    getPublicShop(shopId),
    getShopProducts(shopId),
    getCurrentUser(),
    sql`SELECT id, name, slug FROM categories ORDER BY name`,
  ]);

  if (!shop) notFound();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: storeJsonLd(
            shop,
            `${process.env.NEXT_PUBLIC_SITE_URL || "https://kimoxa.com"}/boutique/${id}`
          ),
        }}
      />
      <ShopClient
        shop={shop}
        products={products}
        initialUser={user}
        categories={categories}
      />
    </>
  );
}