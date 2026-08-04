import Link from "next/link";
import { getCategoriesTree } from "@/lib/queries/categories";
import { getCurrentUser } from "@/lib/session";
import { getActiveFlashSales } from "@/lib/queries/flashSales";
import { getBestSellers, getNewArrivals, getTopRated } from "@/lib/queries/homepage";
import { getRecommendedProducts } from "@/lib/queries/recommendations";
import SiteHeader from "@/app/components/SiteHeader";
import BottomNav from "@/app/components/BottomNav";
import BannerCarousel from "@/app/components/BannerCarousel";
import WhyFasoShop from "@/app/components/WhyFasoShop";
import Footer from "@/app/components/Footer";
import FlashSaleSection from "@/app/components/FlashSaleSection";
import HorizontalProductSection from "@/app/components/HorizontalProductSection";

export const metadata = {
  title: "Accueil",
  description:
    "Commandez où que vous soyez au Burkina Faso. Paiement à la livraison disponible sur toutes les boutiques FasoShop.",
};

// Server Component : les catégories et l'utilisateur connecté sont résolus
// côté serveur avant l'envoi du HTML (plus de "Chargement..." au premier
// rendu, contenu indexable par les moteurs de recherche, pas de flash
// visuel sur l'état de connexion).
export default async function HomePage() {
  const [categories, user, flashSales, bestSellers, newArrivals, topRated] = await Promise.all([
    getCategoriesTree(),
    getCurrentUser(),
    getActiveFlashSales(),
    getBestSellers(),
    getNewArrivals(),
    getTopRated(),
  ]);

  // Recommandations : dépendent de l'utilisateur résolu ci-dessus (besoin de
  // son id), donc requête séparée plutôt que dans le premier Promise.all.
  const recommended = await getRecommendedProducts(user?.id ?? null);

  return (
    <div className="shell">
      <SiteHeader initialUser={user} categories={categories} />

      <div className="woven-strip" />

      <BannerCarousel />

      <div className="trust-strip">
        <div className="trust-card">
          <span className="trust-icon">📱</span>
          <div>
            <p className="trust-card-title">Mobile Money</p>
            <p className="trust-card-desc">Paiement rapide et sécurisé</p>
          </div>
        </div>
        <div className="trust-card">
          <span className="trust-icon">🏪</span>
          <div>
            <p className="trust-card-title">Boutiques vérifiées</p>
            <p className="trust-card-desc">Vendeurs contrôlés par FasoShop</p>
          </div>
        </div>
        <div className="trust-card">
          <span className="trust-icon">🚚</span>
          <div>
            <p className="trust-card-title">Livraison rapide</p>
            <p className="trust-card-desc">Partout au Burkina Faso</p>
          </div>
        </div>
        <div className="trust-card">
          <span className="trust-icon">↩️</span>
          <div>
            <p className="trust-card-title">Support 24/7</p>
            <p className="trust-card-desc">Une équipe à votre écoute</p>
          </div>
        </div>
      </div>

      <WhyFasoShop />

      <FlashSaleSection initialProducts={flashSales} />

      <HorizontalProductSection
        title="Nouveautés"
        icon="✨"
        seeAllHref="/shop?sort=newest"
        products={newArrivals}
        user={user}
      />

      <HorizontalProductSection
        title="Meilleures ventes"
        icon="🏆"
        seeAllHref="/shop"
        products={bestSellers}
        user={user}
      />

      <HorizontalProductSection
        title="Produits populaires"
        icon="⭐"
        seeAllHref="/shop?sort=rating"
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
      {/* Pas de "Voir tout" ici : ce n'est pas une catégorie ou un tri du
          catalogue, juste une sélection personnalisée sur cette page. */}

      <div className="home-section" style={{ textAlign: "center" }}>
        <Link href="/shop">
          <button className="btn btn-primary" style={{ fontSize: "1rem", padding: "14px 36px" }}>
            Voir tout le catalogue →
          </button>
        </Link>
      </div>

      <Footer />
      <BottomNav user={user} />
    </div>
  );
}
