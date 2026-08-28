"use client";

import Link from "next/link";
import KimoxaLogo from "@/app/components/KimoxaLogo";
import {
  ShoppingCartIcon, LockIcon, PackageIcon, CheckCircleIcon, ShieldCheckIcon, WalletIcon,
} from "@/app/components/Icons";

const STEPS = [
  { Icon: ShoppingCartIcon, title: "1. Vous commandez", text: "Choisissez vos produits et payez par Mobile Money (Orange / Moov) ou à la livraison." },
  { Icon: LockIcon, title: "2. Kimoxa sécurise votre argent", text: "Votre paiement est gardé sous séquestre par Kimoxa. Le vendeur ne le reçoit pas tant que vous n'avez rien reçu." },
  { Icon: PackageIcon, title: "3. Le vendeur vous livre", text: "Le vendeur prépare et livre votre commande. Vous suivez son avancement en temps réel." },
  { Icon: CheckCircleIcon, title: "4. Vous confirmez la réception", text: "Une fois le colis reçu et vérifié, vous confirmez. Kimoxa libère alors le paiement au vendeur. Sans confirmation de votre part, libération automatique après 3 jours." },
];

export default function HowItWorksPage() {
  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand"><KimoxaLogo light size={20} /></div>
        <div className="topbar-actions">
          <Link href="/" style={{ color: "var(--sand-50)", fontSize: "0.85rem" }}>← Accueil</Link>
        </div>
      </div>
      <div className="woven-strip" />

      <div className="content" style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ textAlign: "center", padding: "32px 0 8px" }}>
          <h1 style={{ fontSize: "1.7rem", marginBottom: 8 }}>Achetez sans risque</h1>
          <p style={{ color: "var(--ink-500)", fontSize: "0.95rem", maxWidth: 520, margin: "0 auto" }}>
            Kimoxa protège chaque paiement grâce au <strong>séquestre</strong> : votre argent n'est versé au vendeur qu'une fois votre colis reçu.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, margin: "24px 0" }}>
          {STEPS.map(({ Icon, title, text }) => (
            <div key={title} className="va-card" style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "16px" }}>
              <span style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(212,175,55,0.12)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={22} style={{ color: "var(--gold-600)" }} />
              </span>
              <div>
                <strong style={{ display: "block", marginBottom: 4 }}>{title}</strong>
                <span style={{ color: "var(--ink-500)", fontSize: "0.9rem", lineHeight: 1.55 }}>{text}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="va-card" style={{ background: "#f0fdf4", border: "1px solid #86efac", padding: "16px", marginBottom: 24 }}>
          <h3 style={{ margin: "0 0 10px", display: "flex", alignItems: "center", gap: 8, color: "#166534" }}>
            <ShieldCheckIcon size={18} /> Nos garanties
          </h3>
          <ul style={{ margin: 0, paddingLeft: 20, color: "#166534", fontSize: "0.9rem", lineHeight: 1.8 }}>
            <li>Argent remboursable si la commande n'est jamais livrée</li>
            <li>Vendeurs vérifiés (identité contrôlée avant vente)</li>
            <li>Support WhatsApp 7j/7</li>
          </ul>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", paddingBottom: 32 }}>
          <Link href="/" className="btn btn-primary" style={{ textDecoration: "none" }}>Découvrir les produits</Link>
          <Link href="/register" className="btn btn-ghost" style={{ textDecoration: "none" }}>Devenir vendeur</Link>
        </div>

        <div style={{ borderTop: "1px solid var(--border)", padding: "16px 0 90px", textAlign: "center", fontSize: "0.8rem", color: "var(--ink-400)" }}>
          <Link href="/cgu" style={{ color: "inherit", margin: "0 8px" }}>CGU</Link>·
          <Link href="/confidentialite" style={{ color: "inherit", margin: "0 8px" }}>Confidentialité</Link>·
          <Link href="/mentions-legales" style={{ color: "inherit", margin: "0 8px" }}>Mentions légales</Link>
        </div>
      </div>
    </div>
  );
}
