import Link from "next/link";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div>
          <div className="site-footer-brand">🛒 FasoShop</div>
          <p className="site-footer-tagline">
            La marketplace qui connecte les boutiques du Burkina Faso à leurs clients, partout au pays.
          </p>
          <div className="site-footer-socials" style={{ marginTop: 16 }}>
            <a href="#" className="site-footer-social-icon" aria-label="Facebook">📘</a>
            <a href="#" className="site-footer-social-icon" aria-label="Instagram">📷</a>
            <a href="#" className="site-footer-social-icon" aria-label="WhatsApp">💬</a>
          </div>
        </div>

        <div className="site-footer-col">
          <h4>Entreprise</h4>
          <Link href="/a-propos">À propos</Link>
          <Link href="/devenir-vendeur">Devenir vendeur</Link>
          <Link href="/nos-vendeurs">Nos vendeurs</Link>
        </div>

        <div className="site-footer-col">
          <h4>Aide</h4>
          <Link href="/faq">FAQ</Link>
          <Link href="/retours">Politique de retour</Link>
        </div>

        <div className="site-footer-col">
          <h4>Légal</h4>
          <Link href="/cgu">CGU</Link>
          <Link href="/cgv">CGV</Link>
        </div>
      </div>

      <div className="site-footer-bottom">
        © {new Date().getFullYear()} FasoShop — Ouagadougou, Burkina Faso
      </div>
    </footer>
  );
}
