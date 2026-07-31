import Link from "next/link";
import Footer from "@/app/components/Footer";

export default function CGVPage() {
  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/" className="brand" style={{ textDecoration: "none" }}>🛒 FasoShop</Link>
      </div>
      <div className="woven-strip" />

      <div className="content" style={{ maxWidth: 720, margin: "0 auto" }}>
        <div className="page-header">
          <h1>Conditions générales de vente</h1>
        </div>

        <div className="panel">
          <h2>1. Objet</h2>
          <p>FasoShop est une marketplace mettant en relation des boutiques vendeuses indépendantes ("vendeurs") et des acheteurs, pour la vente de produits partout au Burkina Faso.</p>

          <h2>2. Rôle de FasoShop</h2>
          <p>FasoShop agit comme intermédiaire technique. Chaque produit est vendu par le vendeur qui le publie ; celui-ci est seul responsable de la description, de la qualité et de la disponibilité de ses produits.</p>

          <h2>3. Vérification des vendeurs</h2>
          <p>Tout vendeur doit fournir un numéro de pièce d'identité valide (CNI, passeport ou permis de conduire) et être validé par l'équipe FasoShop avant de pouvoir vendre.</p>

          <h2>4. Commandes et paiement</h2>
          <p>Les commandes peuvent être réglées via Mobile Money (Orange Money, Moov Money) ou selon les modalités affichées au moment du paiement.</p>

          <h2>5. Commission</h2>
          <p>FasoShop prélève une commission de 5,5% sur chaque vente réalisée sur la plateforme.</p>

          <h2>6. Livraison</h2>
          <p>Les délais de livraison sont indiqués par chaque vendeur et peuvent varier selon la localisation de l'acheteur.</p>

          <h2>7. Litiges</h2>
          <p>En cas de litige avec un vendeur, l'acheteur peut contacter le support FasoShop, qui pourra intervenir en médiation.</p>

          <p style={{ color: "var(--ink-400)", fontSize: "0.85rem", marginTop: 24 }}>
            Document à faire valider par un professionnel du droit avant mise en production définitive.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
