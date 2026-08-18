import { getCategoriesTree } from "@/lib/queries/categories";
import { getCurrentUser } from "@/lib/session";
import { getActiveFlashSales } from "@/lib/queries/flashSales";
import { getNewArrivals } from "@/lib/queries/homepage";
import { getProducts } from "@/lib/queries/products";
import SiteHeader from "@/app/components/SiteHeader";
import BottomNav from "@/app/components/BottomNav";
import HeroCarousel from "@/app/components/HeroCarousel";
import Footer from "@/app/components/Footer";
import FlashSaleSection from "@/app/components/FlashSaleSection";
import HorizontalProductSection from "@/app/components/HorizontalProductSection";
import CategoryPillBar from "@/app/components/CategoryPillBar";
import HomeFeed from "@/app/components/HomeFeed";

export const revalidate = 60;

export const metadata = {
  title: "Accueil",
  description:
    "Kimoxa, la marketplace multi-vendeurs qui connecte l'Afrique qui vend à l'Afrique qui achète.",
};

export default async function HomePage() {
  const [categories, user, flashSales, newArrivals] = await Promise.all([
    getCategoriesTree(),
    getCurrentUser(),
    getActiveFlashSales(),
    getNewArrivals(),
  ]);

  const featuredIds = new Set([
    ...flashSales.map((p) => p.id),
    ...newArrivals.map((p) => p.id),
  ]);

  const feedResult = await getProducts({ sort: "newest" }, 24, null, user?.id ?? null);
  const feed = feedResult.products;

  return (
    <div className="shell">
      <SiteHeader initialUser={user} categories={categories} />
      <CategoryPillBar categories={categories} />
      <div className="woven-strip" />

      <HeroCarousel featuredProducts={newArrivals} />

      <FlashSaleSection initialProducts={flashSales} />

      <HorizontalProductSection
        title="Nouveautés"
        icon="✨"
        seeAllHref={null}
        products={newArrivals}
        user={user}
      />

      <HomeFeed initialProducts={feed} user={user} excludeIds={featuredIds} />
      <Footer />
      <BottomNav user={user} />
    </div>
  );
}
