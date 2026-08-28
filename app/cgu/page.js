"use client";

import Link from "next/link";
import KimoxaLogo from "@/app/components/KimoxaLogo";

export default function LegalPage() {
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
        <h1 style={{ fontSize: "1.5rem", marginTop: 24 }}>Conditions Générales d'Utilisation</h1>
        <p style={{ color: "var(--ink-400)", fontSize: "0.82rem" }}>Dernière mise à jour : 28 août 2026</p>
        <div style={{ fontSize: "0.92rem", lineHeight: 1.75, color: "var(--ink-600, #444)" }}>
          
<h2>1. Objet</h2>
<p>Les présentes CGU encadrent l'utilisation de la plateforme Kimoxa, marketplace mettant en relation des vendeurs et des acheteurs au Burkina Faso.</p>
<h2>2. Compte utilisateur</h2>
<p>L'achat est possible sans compte. La vente nécessite un compte vendeur vérifié (pièce d'identité contrôlée). Chaque utilisateur est responsable de la confidentialité de ses identifiants.</p>
<h2>3. Commandes et paiement</h2>
<p>Les paiements s'effectuent par Mobile Money (Orange Money, Moov Money) via notre prestataire de paiement, ou en espèces à la livraison lorsque cette option est proposée.</p>
<h2>4. Séquestre (protection de l'acheteur)</h2>
<p>Les paiements en ligne sont conservés sous séquestre par Kimoxa jusqu'à confirmation de réception par l'acheteur. À défaut de confirmation, la libération intervient automatiquement après 3 jours. En cas de non-livraison constatée, l'acheteur est remboursé.</p>
<h2>5. Vendeurs</h2>
<p>Kimoxa prélève une commission de 8% sur chaque vente confirmée. Les vendeurs non vérifiés sont limités à 5 produits actifs. Les reversements aux vendeurs vérifiés s'effectuent par Mobile Money.</p>
<h2>6. Produits interdits</h2>
<p>Sont interdits : produits contrefaits, dangereux, illicites, médicaments sans agrément, et tout produit contraire à la législation burkinabè.</p>
<h2>7. Responsabilité</h2>
<p>Kimoxa agit en qualité d'intermédiaire technique et de tiers de confiance pour les paiements. Les vendeurs demeurent responsables de la conformité de leurs produits.</p>
<h2>8. Droit applicable</h2>
<p>Les présentes CGU sont soumises au droit burkinabè. Tout litige relève des tribunaux compétents de Ouagadougou.</p>
<h2>9. Contact</h2>
<p>Support : WhatsApp 7j/7 · contact@kimoxa.com</p>

        </div>
      </div>
    </div>
  );
}
