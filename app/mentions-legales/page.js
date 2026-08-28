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
        <h1 style={{ fontSize: "1.5rem", marginTop: 24 }}>Mentions Légales</h1>
        <p style={{ color: "var(--ink-400)", fontSize: "0.82rem" }}>Dernière mise à jour : 28 août 2026</p>
        <div style={{ fontSize: "0.92rem", lineHeight: 1.75, color: "var(--ink-600, #444)" }}>
          
<h2>Éditeur</h2>
<p><strong>Kimoxa</strong> — Marketplace de e-commerce<br/>Ouagadougou, Burkina Faso<br/>Email : contact@kimoxa.com<br/>RCCM : [à compléter]</p>
<h2>Directeur de la publication</h2>
<p>Toussaint Kiemde</p>
<h2>Hébergement</h2>
<p>Vercel Inc. — 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis</p>
<h2>Paiements</h2>
<p>Les paiements Mobile Money sont opérés via un prestataire agréé (CinetPay / Ligdicash). Kimoxa ne stocke aucune donnée bancaire.</p>
<h2>Propriété intellectuelle</h2>
<p>La marque Kimoxa, son logo et son contenu sont protégés. Toute reproduction sans autorisation est interdite.</p>

        </div>
      </div>
    </div>
  );
}
