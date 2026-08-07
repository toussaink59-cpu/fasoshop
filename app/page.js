import { getCategoriesTree } from "@/lib/queries/categories";
import { getCurrentUser } from "@/lib/session";
import { getActiveFlashSales } from "@/lib/queries/flashSales";
import { getBestSellers, getNewArrivals, getTopRated } from "@/lib/queries/homepage";
import { getRecommendedProducts } from "@/lib/queries/recommendations";
import { getProducts } from "@/lib/queries/products";
import SiteHeader from "@/app/components/SiteHeader";
import BottomNav from "@/app/components/BottomNav";
import BannerCarousel from "@/app/components/BannerCarousel";
import Footer from "@/app/components/Footer";
import FlashSaleSection from "@/app/components/FlashSaleSection";
import HorizontalProductSection from "@/app/components/HorizontalProductSection";
import CategoryPillBar from "@/app/components/CategoryPillBar";
import HomeFeed from "@/app/components/HomeFeed";

export const metadata = {
  title: "Accueil",
  description:
    "Kimoxa, la marketplace multi-vendeurs qui connecte l'Afrique qui vend à l'Afrique qui achète. Paiement à la livraison et Mobile Money.",
};

export default async function HomePage() {
  const [categories, user, flashSales, bestSellers, newArrivals, topRated] = await Promise.all([
    getCategoriesTree(),
    getCurrentUser(),
    getActiveFlashSales(),
    getBestSellers(),
    getNewArrivals(),
    getTopRated(),
  ]);

  const recommended = await getRecommendedProducts(user?.id ?? null);

  // Flux complet pour le bouton "Voir plus" façon Temu (chargement sur place)
  const feed = await getProducts({ sort: "newest" }, user?.id ?? null);

  return (
    <div className="shell">
      <SiteHeader initialUser={user} categories={categories} />
      <CategoryPillBar categories={categories} />

      <div className="woven-strip" />

      <BannerCarousel />

      <FlashSaleSection initialProducts={flashSales} />

      <HorizontalProductSection
        title="Nouveautés"
        icon="✨"
        seeAllHref={null}
        products={newArrivals}
        user={user}
      />

      <HorizontalProductSection
        title="Meilleures ventes"
        icon="🏆"
        seeAllHref={null}
        products={bestSellers}
        user={user}
      />

      <HorizontalProductSection
        title="Produits populaires"
        icon="⭐"
        seeAllHref={null}
        products={topRated}
        user={user}
      />

      <HorizontalProductSection
        title="Recommandés pour vous"
        icon="🎯"
        seeAllHref={null}
        products={recommended}
        user={user}
      />

      {/* Flux infini façon Temu : "Voir plus" charge sur place, sans changer de page */}
      <HomeFeed initialProducts={feed} user={user} />

      <Footer />
      <BottomNav user={user} />
    </div>
  );
}
