import Link from "next/link";
import KimoxaLogo from "@/app/components/KimoxaLogo";
import PaymentMethods from "@/app/components/PaymentMethods";
import ShareKimoxaFooter from "@/app/components/ShareKimoxaFooter";
import {
  SmartphoneIcon, FacebookIcon, InstagramIcon, WhatsAppIcon, TikTokIcon, MapPinIcon,
} from "@/app/components/Icons";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">

        <div className="temu-footer-brand">
          <KimoxaLogo light size={34} withTagline />
          <p className="site-footer-tagline">
            La marketplace multi-vendeurs qui connecte l'Afrique qui vend à l'Afrique qui achète.
          </p>
        </div>

        <div className="temu-footer-top">
          <div className="temu-footer-app">
            <div className="temu-footer-app-icon" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <SmartphoneIcon size={20} />
            </div>
            <div>
              <strong>Application mobile</strong>
              <span>Installez-la depuis votre navigateur</span>
            </div>
          </div>
          <div className="temu-footer-socials">
            <span className="temu-footer-socials-title">Suivez-nous</span>
            <div className="site-footer-socials">
              <a href="#" className="site-footer-social-icon" aria-label="Facebook" style={{ color: "#1877F2" }}><FacebookIcon size={18} /></a>
              <a href="#" className="site-footer-social-icon" aria-label="Instagram" style={{ color: "#E4405F" }}><InstagramIcon size={18} /></a>
              <a href="#" className="site-footer-social-icon" aria-label="WhatsApp" style={{ color: "#25D366" }}><WhatsAppIcon size={18} /></a>
              <a href="#" className="site-footer-social-icon" aria-label="TikTok" style={{ color: "#ffffff" }}><TikTokIcon size={18} /></a>
            </div>
          </div>
        </div>

        <div className="temu-footer-payments">
          <span className="temu-footer-payments-title">Paiements acceptés</span>
          <PaymentMethods />
        </div>

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
            <Link href="/devenir-vendeur">Devenir vendeur</Link>
            <Link href="/vendor/dashboard">Espace vendeur</Link>
          </div>
          <div className="site-footer-col">
            <h4>Kimoxa</h4>
            <Link href="/a-propos">À propos</Link>
            <Link href="/cgu">Conditions d'utilisation</Link>
            <Link href="/cgv">Conditions de vente</Link>
                <ShareKimoxaFooter />
          </div>
        </div>

        <div className="temu-footer-bottombar">
          <span className="temu-footer-country" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <MapPinIcon size={14} /> Burkina Faso
          </span>
          <span>© {new Date().getFullYear()} Kimoxa — Conçu pour toute l'Afrique</span>
        </div>
      </div>
    </footer>
  );
}
