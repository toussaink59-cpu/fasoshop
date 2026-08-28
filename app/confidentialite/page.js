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
        <h1 style={{ fontSize: "1.5rem", marginTop: 24 }}>Politique de Confidentialité</h1>
        <p style={{ color: "var(--ink-400)", fontSize: "0.82rem" }}>Dernière mise à jour : 28 août 2026</p>
        <div style={{ fontSize: "0.92rem", lineHeight: 1.75, color: "var(--ink-600, #444)" }}>
          
<h2>1. Données collectées</h2>
<p>Nous collectons uniquement les données nécessaires : nom, téléphone, email, adresse de livraison, historique de commandes, et pour les vendeurs, pièce d'identité et numéro Mobile Money.</p>
<h2>2. Utilisation</h2>
<p>Vos données servent à : traiter les commandes, assurer le séquestre et les reversements, fournir le support client, et prévenir la fraude.</p>
<h2>3. Partage</h2>
<p>Les données de paiement sont traitées par notre prestataire Mobile Money agréé. Kimoxa ne vend jamais vos données à des tiers.</p>
<h2>4. Conservation</h2>
<p>Les données sont conservées pendant la durée légale applicable, puis supprimées ou anonymisées.</p>
<h2>5. Vos droits</h2>
<p>Vous pouvez demander l'accès, la rectification ou la suppression de vos données en écrivant à contact@kimoxa.com ou via le support WhatsApp.</p>
<h2>6. Sécurité</h2>
<p>Mots de passe chiffrés, connexions HTTPS, journalisation de sécurité et plafonds de paiement protègent votre compte.</p>

        </div>
      </div>
    </div>
  );
}
