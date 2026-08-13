import { getCurrentUser } from "@/lib/session";
import { getCategoriesTree } from "@/lib/queries/categories";
import SiteHeader from "@/app/components/SiteHeader";
import Footer from "@/app/components/Footer";
import BottomNav from "@/app/components/BottomNav";

export const metadata = {
  title: "À propos",
};

export default async function AboutPage() {
  const [user, categories] = await Promise.all([
    getCurrentUser(),
    getCategoriesTree(),
  ]);

  return (
    <div className="shell">
      <SiteHeader initialUser={user} categories={categories} />

      <div className="content" style={{ maxWidth: 720, margin: "0 auto" }}>
        <div className="page-header" style={{ textAlign: "center" }}>
          <h1>À propos de Kimoxa</h1>
          <p>Connecter · Innover · Prospérer</p>
        </div>

        <div className="panel">
          <p>
            Kimoxa est une marketplace multi-vendeurs née à Ouagadougou et conçue pour toute
            l'Afrique. Notre mission : donner à chaque boutique, chaque artisan et chaque
            entrepreneur une vitrine en ligne simple et fiable — et à chaque acheteur un moyen
            sûr de trouver des produits locaux, partout sur le continent.
          </p>
          <p>
            Notre conviction est simple : le commerce en ligne africain doit s'adapter aux
            réalités du terrain — paiement Mobile Money, livraison locale, et confiance vérifiée
            entre vendeurs et acheteurs — plutôt que de copier des modèles pensés ailleurs.
          </p>

          <h2>Notre engagement</h2>
          <p>
            Chaque boutique présente sur Kimoxa est vérifiée manuellement par notre équipe à
            partir d'une pièce d'identité officielle, avant de pouvoir vendre. C'est notre façon
            de construire une place de marché où l'on peut acheter en confiance.
          </p>

          <h2>Notre modèle</h2>
          <p>
            L'inscription est gratuite pour les vendeurs. Kimoxa se rémunère uniquement via une
            commission de 9% sur les ventes réalisées, ce qui aligne nos intérêts avec la
            réussite de chaque boutique.
          </p>

          <h2>Notre ambition</h2>
          <p>
            Après le Burkina Faso 🇧🇫, Kimoxa s'étendra progressivement au Sénégal, à la Côte
            d'Ivoire, au Mali et au-delà — avec les paiements mobiles de chaque pays (Orange
            Money, Moov Money, MTN MoMo, M-Pesa, Wave) et une livraison multi-pays.
            Une plateforme intelligente, des possibilités infinies.
          </p>
        </div>
      </div>

      <Footer />
      <BottomNav user={user} />
    </div>
  );
}
