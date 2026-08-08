import Link from "next/link";
import KimoxaLogo from "@/app/components/KimoxaLogo";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">

        {/* 1. Logo + promesse */}
        <div className="temu-footer-brand">
          <KimoxaLogo light size={34} withTagline />
          <p className="site-footer-tagline">
            La marketplace multi-vendeurs qui connecte l'Afrique qui vend à l'Afrique qui achète.
          </p>
        </div>

        {/* 2. Application + réseaux sociaux */}
        <div className="temu-footer-top">
          <div className="temu-footer-app">
            <div className="temu-footer-app-icon">📲</div>
            <div>
              <strong>Application mobile</strong>
              <span>Installez-la depuis votre navigateur 📲</span>
            </div>
          </div>
          <div className="temu-footer-socials">
            <span className="temu-footer-socials-title">Suivez-nous</span>
            <div className="site-footer-socials">
              <a href="#" className="site-footer-social-icon" aria-label="Facebook">📘</a>
              <a href="#" className="site-footer-social-icon" aria-label="Instagram">📷</a>
              <a href="#" className="site-footer-social-icon" aria-label="WhatsApp">💬</a>
              <a href="#" className="site-footer-social-icon" aria-label="TikTok">🎵</a>
            </div>
          </div>
        </div>

        {/* 3. Vrais logos de paiement */}
        <div className="temu-footer-payments">
          <span className="temu-footer-payments-title">Paiements acceptés</span>
          <div className="temu-footer-payment-badges">
            <span className="pay-logo pay-om"><b>orange</b> money</span>
            <span className="pay-logo pay-moov"><b>moov</b> money</span>
            <span className="pay-logo pay-mtn"><b>MTN</b> MoMo</span>
            <span className="pay-logo pay-mpesa"><b>M-PESA</b></span>
            <span className="pay-logo pay-wave"><b>wave</b></span>
            <span className="pay-logo pay-cod">💵 À la livraison</span>
          </div>
        </div>

        {/* 4. Trois colonnes de liens */}
        <div className="footer-cols temu-footer-cols">
          <div className="site-footer-col">
            <h4>Vous aider</h4>
            <Link href="/faq">FAQ</Link>
            <Link href="/orders">Suivi de commande</Link>
            <Link href="/retours">Retours & remboursements</Link>
            <Link href="/messages">Nous contacter</Link>
          </div>

                   <div className="site-footer-col">
            <h4>Vendre sur Kimoxa</h4>
            <Link href="/devenir-vendeur" className="footer-cta-vendor">Devenir vendeur →</Link>
            <Link href="/vendor/dashboard">Espace vendeur</Link>
          </div>

          <div className="site-footer-col">
            <h4>Kimoxa</h4>
            <Link href="/a-propos">À propos</Link>
            <Link href="/cgu">Conditions d'utilisation</Link>
            <Link href="/cgv">Conditions de vente</Link>
          </div>
        </div>

        {/* 5. Barre basse */}
        <div className="temu-footer-bottombar">
          <span className="temu-footer-country">🇧🇫 Burkina Faso</span>
          <span>© {new Date().getFullYear()} Kimoxa — Conçu pour toute l'Afrique 🌍</span>
        </div>
      </div>
    </footer>
  );
}
