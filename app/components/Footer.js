import Link from "next/link";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">

        {/* 1. Logo + promesse panafricaine */}
        <div className="temu-footer-brand">
          <div className="site-footer-brand">🛒 FasoShop</div>
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
              <span>Bientôt sur Android & iPhone</span>
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

        {/* 3. Paiements acceptés (logos façon Temu) */}
        <div className="temu-footer-payments">
          <span className="temu-footer-payments-title">Paiements acceptés</span>
          <div className="temu-footer-payment-badges">
            <span className="pay-logo"><i style={{ background: "#FF7900" }} />Orange Money</span>
            <span className="pay-logo"><i style={{ background: "#0072BC" }} />Moov Money</span>
            <span className="pay-logo"><i style={{ background: "#FFCC00" }} />MTN MoMo</span>
            <span className="pay-logo"><i style={{ background: "#4CAF50" }} />M-Pesa</span>
            <span className="pay-logo"><i style={{ background: "#00B8E6" }} />Wave</span>
            <span className="pay-logo"><i style={{ background: "#2f7a3d" }} />💵 À la livraison</span>
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
            <h4>Vendre sur FasoShop</h4>
            <Link href="/devenir-vendeur" className="footer-cta-vendor">Devenir vendeur →</Link>
            <Link href="/vendor/dashboard">Espace vendeur</Link>
            <Link href="/nos-vendeurs">Nos vendeurs</Link>
          </div>

          <div className="site-footer-col">
            <h4>FasoShop</h4>
            <Link href="/a-propos">À propos</Link>
            <Link href="/cgu">Conditions d'utilisation</Link>
            <Link href="/cgv">Conditions de vente</Link>
          </div>
        </div>

        {/* 5. Barre basse : pays + copyright */}
        <div className="temu-footer-bottombar">
          <span className="temu-footer-country">🇧🇫 Burkina Faso</span>
          <span>© {new Date().getFullYear()} FasoShop — Conçu pour toute l'Afrique 🌍</span>
        </div>
      </div>
    </footer>
  );
}
