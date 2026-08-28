"use client";

import Link from "next/link";
import KimoxaLogo from "@/app/components/KimoxaLogo";

export default function CgvPage() {
  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand"><KimoxaLogo light size={20} /></div>
        <div className="topbar-actions">
          <Link href="/" style={{ color: "var(--sand-50)", fontSize: "0.85rem" }}>← Accueil</Link>
        </div>
      </div>
      <div className="woven-strip" />
      <div className="content" style={{ maxWidth: 760, margin: "0 auto", paddingBottom: 90 }}>
        <h1 style={{ fontSize: "1.5rem", marginTop: 24 }}>Conditions Générales de Vente</h1>
        <p style={{ color: "var(--ink-400)", fontSize: "0.82rem" }}>Dernière mise à jour : 28 août 2026</p>
        <div style={{ fontSize: "0.92rem", lineHeight: 1.75, color: "var(--ink-600, #444)" }}>
          <h2>1. Objet</h2>
          <p>Les présentes CGV encadrent la vente de produits sur la plateforme Kimoxa entre vendeurs vérifiés et acheteurs.</p>

          <h2>2. Processus d'achat</h2>
          <p>L'acheteur choisit un produit, valide son panier, indique son adresse de livraison puis procède au paiement. Une confirmation de commande lui est envoyée par email et/ou SMS.</p>

          <h2>3. Prix et frais de livraison</h2>
          <p>Les prix affichés sont en francs CFA (XOF) toutes taxes comprises. Les frais de livraison éventuels sont indiqués avant validation finale de la commande.</p>

          <h2>4. Modalités de paiement</h2>
          <p>Les paiements s'effectuent par Mobile Money (Orange Money, Moov Money) via notre prestataire de paiement agréé, ou en espèces à la livraison lorsque cette option est proposée par le vendeur.</p>

          <h2>5. Séquestre et protection de l'acheteur</h2>
          <p>Les paiements en ligne sont conservés sous séquestre par Kimoxa jusqu'à confirmation de réception par l'acheteur. En l'absence de confirmation explicite, la libération intervient automatiquement 3 jours après expédition. En cas de litige (non-livraison, produit non conforme), l'acheteur peut ouvrir une réclamation via le support WhatsApp dans les 7 jours suivant la réception.</p>

          <h2>6. Livraison</h2>
          <p>Les délais de livraison sont indicatifs et dépendent du vendeur et du transporteur choisi. Kimoxa met tout en œuvre pour faire respecter ces délais, mais ne peut être tenu responsable des retards indépendants de sa volonté.</p>

          <h2>7. Droit de rétractation</h2>
          <p>Conformément à la législation en vigueur au Burkina Faso, l'acheteur dispose d'un droit de rétractation de 7 jours à compter de la réception pour les produits non consommables et non personnalisés, sous réserve du retour du produit dans son état d'origine.</p>

          <h2>8. Garanties</h2>
          <p>Les produits bénéficient des garanties légales de conformité et contre les vices cachés. Les garanties commerciales éventuelles sont précisées sur chaque fiche produit.</p>

          <h2>9. Réclamations et SAV</h2>
          <p>Toute réclamation doit être formulée auprès du vendeur via la messagerie Kimoxa ou le support WhatsApp. En cas de désaccord persistant, l'acheteur peut solliciter Kimoxa en tant que médiateur.</p>

          <h2>10. Droit applicable</h2>
          <p>Les présentes CGV sont régies par le droit burkinabè. En cas de litige non résolu à l'amiable, compétence est attribuée aux tribunaux de Ouagadougou.</p>
        </div>
      </div>
    </div>
  );
}
