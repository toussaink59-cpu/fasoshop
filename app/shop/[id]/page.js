import { ShoppingBagIcon } from "@/app/components/Icons";
import Link from "next/link";
import { getProductDetail, getProductReviews } from "@/lib/queries/productDetail";
import { getCurrentUser } from "@/lib/session";
import { getCategoriesTree } from "@/lib/queries/categories";
import { productJsonLd } from "@/lib/structuredData";
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
            : `${product.name} — achetez en toute confiance sur Kimoxa.`,
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
            <div className="glyph"><ShoppingBagIcon size={48} style={{ color: "var(--ink-300)" }} /></div>
            <p>Produit introuvable.</p>
            <Link href="/shop">← Retour au catalogue</Link>
          </div>
        </div>
        <BottomNav user={user} />
      </div>
    );
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: productJsonLd(
            product,
            `${process.env.NEXT_PUBLIC_SITE_URL || "https://kimoxa.com"}/shop/${id}`
          ),
        }}
      />
      <ProductDetailClient
        id={id}
        product={product}
        initialReviews={initialReviews}
        initialUser={user}
        categories={categories}
      />
    </>
  );
}
