import Link from "next/link";
import Footer from "@/app/components/Footer";

export default function AProposPage() {
  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/" className="brand" style={{ textDecoration: "none" }}>🛒 FasoShop</Link>
      </div>
      <div className="woven-strip" />

      <div className="content" style={{ maxWidth: 720, margin: "0 auto" }}>
        <div className="page-header">
          <h1>À propos de FasoShop</h1>
        </div>

        <div className="panel">
          <p>
            FasoShop est une marketplace née à Ouagadougou, pensée pour donner aux boutiques
            burkinabè une vitrine en ligne simple et fiable — et aux acheteurs un moyen sûr
            de trouver des produits locaux, partout au pays.
          </p>
          <p>
            Notre conviction est simple : le commerce en ligne en Afrique de l'Ouest doit
            s'adapter aux réalités du terrain — paiement Mobile Money, livraison locale,
            et confiance vérifiée entre vendeurs et acheteurs — plutôt que de copier des
            modèles pensés ailleurs.
          </p>

          <h2>Notre engagement</h2>
          <p>
            Chaque boutique présente sur FasoShop est vérifiée manuellement par notre équipe
            à partir d'une pièce d'identité officielle, avant de pouvoir vendre. C'est notre
            façon de construire une place de marché où l'on peut acheter en confiance.
          </p>

          <h2>Notre modèle</h2>
          <p>
            L'inscription est gratuite pour les vendeurs. FasoShop se rémunère uniquement via
            une commission de 5,5% sur les ventes réalisées, ce qui aligne nos intérêts avec
            la réussite de chaque boutique.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
