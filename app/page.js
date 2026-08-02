import Link from "next/link";
import { getCategoriesTree } from "@/lib/queries/categories";
import { getCurrentUser } from "@/lib/session";
import HomeHeader from "@/app/components/HomeHeader";
import BannerCarousel from "@/app/components/BannerCarousel";
import WhyFasoShop from "@/app/components/WhyFasoShop";
import Footer from "@/app/components/Footer";
import FlashSaleSection from "@/app/components/FlashSaleSection";

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
  const [categories, user] = await Promise.all([
    getCategoriesTree(),
    getCurrentUser(),
  ]);

  return (
    <div className="shell">
      <HomeHeader initialUser={user} categories={categories} />

      <div className="woven-strip" />

      <BannerCarousel />

      <div className="trust-strip">
        <div className="trust-item"><span className="trust-icon">📱</span> Paiement Mobile Money</div>
        <div className="trust-item"><span className="trust-icon">🏪</span> Boutiques vérifiées</div>
        <div className="trust-item"><span className="trust-icon">🚚</span> Livraison partout au pays</div>
        <div className="trust-item"><span className="trust-icon">↩️</span> Support client réactif</div>
      </div>

      <WhyFasoShop />

      <FlashSaleSection />

      <div className="home-section" style={{ textAlign: "center" }}>
        <Link href="/shop">
          <button className="btn btn-primary" style={{ fontSize: "1rem", padding: "14px 36px" }}>
            Voir tout le catalogue →
          </button>
        </Link>
      </div>

      <Footer />
    </div>
  );
}
