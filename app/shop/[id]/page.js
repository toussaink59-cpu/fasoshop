import Link from "next/link";
import { getProductDetail, getProductReviews } from "@/lib/queries/productDetail";
import { getCurrentUser } from "@/lib/session";
import { getCategoriesTree } from "@/lib/queries/categories";
import SiteHeader from "@/app/components/SiteHeader";
import BottomNav from "@/app/components/BottomNav";
import ProductDetailClient from "@/app/shop/[id]/ProductDetailClient";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const product = await getProductDetail(id);
  if (!product) return { title: "Produit introuvable" };

  return {
    title: product.name,
    description: product.description
      ? product.description.slice(0, 160)
      : `${product.name} — vendu par ${product.shop_name} sur FasoShop.`,
    openGraph: {
      title: product.name,
      description: product.description || undefined,
      images: product.images?.[0] ? [product.images[0]] : undefined,
    },
  };
}

export default async function ProductDetailPage({ params }) {
  const { id } = await params;

  const [product, initialReviews, user, categories] = await Promise.all([
    getProductDetail(id),
    getProductReviews(id),
    getCurrentUser(),
    getCategoriesTree(),
  ]);

  if (!product) {
    return (
      <div className="shell">
        <SiteHeader initialUser={user} categories={categories} />
        <div className="content">
          <div className="empty-state">
            <div className="glyph">🛍️</div>
            <p>Produit introuvable.</p>
            <Link href="/shop">← Retour au catalogue</Link>
          </div>
        </div>
        <BottomNav user={user} />
      </div>
    );
  }

  return (
    <ProductDetailClient
      id={id}
      product={product}
      initialReviews={initialReviews}
      initialUser={user}
      categories={categories}
    />
  );
}
