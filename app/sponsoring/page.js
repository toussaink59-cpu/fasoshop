import Link from "next/link";
import SiteHeader from "@/app/components/SiteHeader";
import Footer from "@/app/components/Footer";
import { getCategoriesTree } from "@/lib/queries/categories";
import { getCurrentUser } from "@/lib/session";
import { SPONSOR_PACKS, formatFcfa } from "@/lib/sponsorship";
import { StarIcon, CheckCircleIcon, WalletIcon, BadgeCheckIcon, StoreIcon, ArrowRightIcon } from "@/app/components/Icons";

export const metadata = {
  title: "Sponsoring produit — Kimoxa",
  description: "Mettez vos produits en première ligne sur Kimoxa : packs 1, 3, 6 et 12 mois, badge Sponsorisé, visibilité maximale.",
};

const BENEFITS = [
  { Icon: StarIcon, title: "Première ligne", text: "Vos produits apparaissent en tête des catégories et dans les Nouveautés de la page d'accueil." },
  { Icon: BadgeCheckIcon, title: "Badge Sponsorisé", text: "Un badge doré distinctif qui attire l'oeil et inspire confiance aux acheteurs." },
  { Icon: StoreIcon, title: "Plus de ventes", text: "Plus de visibilité = plus de clics = plus de commandes. Simple et efficace." },
];

const STEPS = [
  { Icon: StoreIcon, title: "1. Demandez depuis votre dashboard", text: "Tableau de bord vendeur → Mes produits → Sponsoriser, puis choisissez votre pack." },
  { Icon: WalletIcon, title: "2. Payez par Mobile Money", text: "Réglez le montant du pack par Orange Money ou Moov Money auprès de l'équipe Kimoxa." },
  { Icon: CheckCircleIcon, title: "3. Validation sous 24 h", text: "Dès confirmation du paiement, votre produit est mis en avant pour toute la durée du pack." },
];

const FAQ = [
  { q: "Puis-je sponsoriser plusieurs produits ?", a: "Oui. Chaque produit possède sa propre demande de sponsoring et son propre pack." },
  { q: "Que se passe-t-il à la fin du pack ?", a: "Le produit revient automatiquement à son placement normal. Vous pouvez renouveler à tout moment." },
  { q: "Le sponsoring garantit-il des ventes ?", a: "Il garantit une visibilité maximale (première ligne + badge). Les ventes dépendent de votre prix, vos photos et vos avis clients." },
  { q: "Comment payer ?", a: "Par Orange Money ou Moov Money après votre demande. L'équipe confirme le paiement puis valide la mise en avant." },
  { q: "Puis-je prolonger un pack en cours ?", a: "Oui, dès l'expiration du pack en cours, une nouvelle demande peut être créée depuis votre dashboard." },
];

export default async function SponsoringPage() {
  const [user, categories] = await Promise.all([getCurrentUser(), getCategoriesTree()]);
  const isVendor = user?.role === "vendor";

  return (
    <div className="shell">
      <SiteHeader initialUser={user} categories={categories} />
      <div className="woven-strip" />

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px 48px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <p style={{ color: "var(--gold-600)", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", fontSize: "0.8rem", margin: 0 }}>Visibilité maximale</p>
          <h1 style={{ fontSize: "1.8rem", margin: "8px 0" }}>Mettez vos produits en première ligne</h1>
          <p style={{ color: "var(--ink-400)", maxWidth: 560, margin: "0 auto", lineHeight: 1.6 }}>
            Le sponsoring Kimoxa place vos produits en tête des catégories et sur la page d'accueil, avec un badge doré qui fait la différence.
          </p>
        </div>

        <div className="sponsor-benefits">
          {BENEFITS.map(({ Icon, title, text }) => (
            <div key={title} className="va-card" style={{ textAlign: "center" }}>
              <div style={{ display: "inline-flex", color: "var(--gold-600)", marginBottom: 8 }}><Icon size={28} /></div>
              <h3 style={{ margin: "0 0 6px", fontSize: "1rem" }}>{title}</h3>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--ink-400)", lineHeight: 1.5 }}>{text}</p>
            </div>
          ))}
        </div>

        <h2 style={{ textAlign: "center", fontSize: "1.3rem", marginBottom: 20 }}>Tarifs simples et dégressifs</h2>
        <div className="sponsor-packs">
          {SPONSOR_PACKS.map((pack) => (
            <div key={pack.id} className="va-card" style={{ position: "relative", textAlign: "center", border: pack.popular || pack.bestValue ? "2px solid var(--gold-500)" : undefined }}>
              {(pack.popular || pack.bestValue) && (
                <span style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "var(--gold-500)", color: "#fff", fontSize: "0.68rem", fontWeight: 800, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap" }}>
                  {pack.popular ? "Populaire" : "Meilleure valeur"}
                </span>
              )}
              <div style={{ fontWeight: 800, fontSize: "1.05rem" }}>{pack.label}</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--gold-600)", margin: "6px 0" }}>{formatFcfa(pack.priceFcfa)}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--ink-400)" }}>soit ~{formatFcfa(Math.round(pack.priceFcfa / (pack.durationDays / 30)))} / mois</div>
            </div>
          ))}
        </div>
        <p style={{ textAlign: "center", fontSize: "0.8rem", color: "var(--ink-400)", marginBottom: 36 }}>
          Paiement unique par pack, via Orange Money ou Moov Money. Validation sous 24 h.
        </p>

        <h2 style={{ textAlign: "center", fontSize: "1.3rem", marginBottom: 16 }}>Comment ça marche ?</h2>
        <div className="sponsor-benefits">
          {STEPS.map(({ Icon, title, text }) => (
            <div key={title} className="va-card">
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--gold-600)", marginBottom: 6 }}>
                <Icon size={20} /><h3 style={{ margin: 0, fontSize: "0.95rem", color: "var(--ink-900)" }}>{title}</h3>
              </div>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--ink-400)", lineHeight: 1.5 }}>{text}</p>
            </div>
          ))}
        </div>

        <h2 style={{ textAlign: "center", fontSize: "1.3rem", marginBottom: 16 }}>Questions fréquentes</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 36 }}>
          {FAQ.map(({ q, a }) => (
            <details key={q} className="va-card" style={{ padding: "12px 16px" }}>
              <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: "0.92rem" }}>{q}</summary>
              <p style={{ margin: "8px 0 0", fontSize: "0.85rem", color: "var(--ink-400)", lineHeight: 1.55 }}>{a}</p>
            </details>
          ))}
        </div>

        <div className="va-card" style={{ textAlign: "center", border: "1px solid var(--gold-500)" }}>
          <h2 style={{ margin: "0 0 8px", fontSize: "1.2rem" }}>Prêt à booster vos ventes ?</h2>
          <p style={{ margin: "0 0 16px", fontSize: "0.9rem", color: "var(--ink-400)" }}>
            {isVendor ? "Demandez le sponsoring directement depuis votre dashboard vendeur." : "Créez votre boutique Kimoxa puis sponsorisez vos produits en 2 minutes."}
          </p>
          <Link href={isVendor ? "/vendor/dashboard" : "/login"} className="btn btn-primary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
            {isVendor ? "Ouvrir mon dashboard" : "Devenir vendeur"} <ArrowRightIcon size={16} />
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
