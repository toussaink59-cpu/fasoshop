import Link from "next/link";
import Footer from "@/app/components/Footer";

export default function RetoursPage() {
  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/" className="brand" style={{ textDecoration: "none" }}>🛒 FasoShop</Link>
      </div>
      <div className="woven-strip" />

      <div className="content" style={{ maxWidth: 720, margin: "0 auto" }}>
        <div className="page-header">
          <h1>Politique de retour</h1>
        </div>

        <div className="panel">
          <h2>Délai de retour</h2>
          <p>Vous disposez de 48 heures après réception de votre commande pour signaler un problème (produit non conforme, endommagé ou incomplet).</p>

          <h2>Comment procéder</h2>
          <p>Contactez le vendeur concerné directement depuis votre page "Mes commandes", en précisant le motif du retour et si possible une photo du produit reçu.</p>

          <h2>Produits non éligibles</h2>
          <p>Les produits périssables, personnalisés ou d'hygiène intime ne peuvent pas être retournés, sauf défaut avéré.</p>

          <h2>Remboursement</h2>
          <p>Une fois le retour validé par le vendeur, le remboursement est effectué sur le même moyen de paiement utilisé pour la commande, sous un délai raisonnable.</p>

          <h2>Litige avec un vendeur</h2>
          <p>Si aucun accord n'est trouvé avec le vendeur, contactez le support FasoShop pour une médiation.</p>

          <p style={{ color: "var(--ink-400)", fontSize: "0.85rem", marginTop: 24 }}>
            Cette politique pourra être ajustée à mesure que le service après-vente se structure.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
