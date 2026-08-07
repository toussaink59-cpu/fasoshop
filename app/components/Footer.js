import Link from "next/link";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">

        {/* 1. Marque + promesse panafricaine */}
        <div className="footer-brand-block">
          <div className="site-footer-brand">🛒 FasoShop</div>
          <p className="site-footer-tagline">
            La marketplace multi-vendeurs qui connecte l'Afrique qui vend à l'Afrique qui achète.
          </p>
          <div className="site-footer-socials">
            <a href="#" className="site-footer-social-icon" aria-label="Facebook">📘</a>
            <a href="#" className="site-footer-social-icon" aria-label="Instagram">📷</a>
            <a href="#" className="site-footer-social-icon" aria-label="WhatsApp">💬</a>
          </div>
        </div>

        {/* 2. Bandeau confiance panafricain */}
        <div className="footer-trust">
          <span>📱 Orange Money · Moov Money · MTN MoMo · M-Pesa · Wave</span>
          <span>💵 Paiement à la livraison</span>
          <span>🚚 Livraison multi-pays</span>
          <span>🛡️ Acheteurs protégés</span>
        </div>

        {/* 3. Quatre blocs de liens */}
        <div className="footer-cols">
          <div className="site-footer-col">
            <h4>🛍️ Acheter</h4>
            <Link href="/shop">Catalogue</Link>
            <Link href="/shop?sort=newest">Nouveautés</Link>
            <Link href="/favoris">Mes favoris</Link>
            <Link href="/orders">Suivi de commande</Link>
          </div>

          <div className="site-footer-col">
            <h4>🏪 Vendre</h4>
            <Link href="/devenir-vendeur" className="footer-cta-vendor">Devenir vendeur →</Link>
            <Link href="/vendor/dashboard">Tableau de bord vendeur</Link>
            <Link href="/nos-vendeurs">Nos vendeurs</Link>
          </div>

          <div className="site-footer-col">
            <h4>🤝 Aide</h4>
            <Link href="/faq">FAQ</Link>
            <Link href="/retours">Politique de retour</Link>
            <Link href="/messages">Support & messages</Link>
          </div>

          <div className="site-footer-col">
            <h4>🌍 FasoShop</h4>
            <Link href="/a-propos">À propos</Link>
            <Link href="/cgu">CGU</Link>
            <Link href="/cgv">CGV</Link>
          </div>
        </div>

        {/* 4. Pays desservis */}
        <div className="footer-countries">
          <strong>Pays desservis :</strong> 🇧 Burkina Faso
          <span className="footer-countries-soon">
            {" "}· Bientôt : 🇸🇳 🇨🇮 🇲🇱 🇬🇳 🇧🇯 🇹🇬 — et toute l'Afrique 🌍
          </span>
        </div>
      </div>

      <div className="site-footer-bottom">
        © {new Date().getFullYear()} FasoShop — Né à Ouagadougou, conçu pour toute l'Afrique 🌍
      </div>
    </footer>
  );
}
