import CategoryTiles from "@/app/components/CategoryTiles";
import TrustStrip from "@/app/components/TrustStrip";
import RoleRedirect from "@/app/components/RoleRedirect";
import { redirect } from "next/navigation";
import { getCategoriesTree } from "@/lib/queries/categories";
import { getCurrentUser } from "@/lib/session";
import { getActiveFlashSales } from "@/lib/queries/flashSales";
import { getNewArrivals, getBestSellers, getTopRated } from "@/lib/queries/homepage";
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
  let categories, user, flashSales, newArrivals, bestSellers;
  try {
    [categories, user, flashSales, newArrivals] = await Promise.all([
    getCategoriesTree(),
    getCurrentUser(),
    getActiveFlashSales(),
    getNewArrivals(),
    ]);
    // Anti-répétition : jamais de produits déjà présents dans Nouveautés
    if (!Array.isArray(bestSellers) || bestSellers.length === 0) {
      try {
        const top = await getTopRated(8);
        const newArrIds = new Set((newArrivals || []).map((x) => x.id));
        bestSellers = (top || []).filter((x) => !newArrIds.has(x.id));
      } catch { bestSellers = []; }
    }
  } catch (err) {
    console.error('[page.js] Erreur chargement données accueil:', err.message);
    // Fallback : valeurs par défaut pour permettre le démarrage
    categories = [];
    user = null;
    flashSales = [];
    newArrivals = [];
    bestSellers = [];
  }

  // Redirection automatique selon le role (PWA, bookmark, lien direct)
  // IMPORTANT : redirect() lance une exception NEXT_REDIRECT -> jamais dans un try/catch
  let shopStatus = null;
  if (user?.role === "vendor") {
    try {
      const { default: sql } = await import("@/lib/db");
      const [shop] = await sql`SELECT status FROM shops WHERE vendor_id = ${user.id}`;
      shopStatus = shop?.status || null;
    } catch (e) { /* reste sur homepage */ }
  }
  if (user?.role === "admin") redirect("/admin/dashboard");
  if (user?.role === "vendor" && shopStatus === "active") redirect("/vendor/dashboard");


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

      <CategoryTiles />

      <TrustStrip />

      <FlashSaleSection initialProducts={flashSales} />

      <HorizontalProductSection
        title="Nouveautés"
        icon={null}
        seeAllHref={null}
        products={newArrivals}
        user={user}
      />

      <HorizontalProductSection
        title="Meilleures ventes"
        icon={null}
        seeAllHref="/shop?sort=popular"
        products={bestSellers}
        user={user}
      />

      <HomeFeed initialProducts={feed} user={user} excludeIds={featuredIds} />
      <Footer />
      <BottomNav user={user} />
    </div>
  );
}
