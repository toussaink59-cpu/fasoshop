import Link from "next/link";
import Footer from "@/app/components/Footer";

export default function CGUPage() {
  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/" className="brand" style={{ textDecoration: "none" }}>🛒 FasoShop</Link>
      </div>
      <div className="woven-strip" />

      <div className="content" style={{ maxWidth: 720, margin: "0 auto" }}>
        <div className="page-header">
          <h1>Conditions générales d'utilisation</h1>
        </div>

        <div className="panel">
          <h2>1. Objet</h2>
          <p>
            Les présentes conditions régissent l'accès et l'utilisation du site FasoShop par
            tout visiteur, acheteur ou vendeur. L'utilisation du site implique l'acceptation
            pleine et entière de ces conditions.
          </p>

          <h2>2. Création de compte</h2>
          <p>
            L'inscription est ouverte à toute personne physique majeure. Les informations
            fournies (nom, email, téléphone) doivent être exactes. Pour les comptes vendeurs,
            une pièce d'identité valide est requise et vérifiée avant activation.
          </p>

          <h2>3. Comportement des utilisateurs</h2>
          <p>
            Chaque utilisateur s'engage à ne pas publier de contenu illicite, trompeur ou
            portant atteinte aux droits d'autrui, et à utiliser le site de manière loyale.
          </p>

          <h2>4. Propriété intellectuelle</h2>
          <p>
            L'ensemble des éléments du site FasoShop (marque, logo, structure) est protégé.
            Les vendeurs restent responsables des visuels et descriptions qu'ils publient.
          </p>

          <h2>5. Responsabilité</h2>
          <p>
            FasoShop agit comme intermédiaire technique entre vendeurs et acheteurs. La
            responsabilité de FasoShop ne saurait être engagée pour un litige portant sur
            la qualité ou la conformité d'un produit vendu par un tiers.
          </p>

          <h2>6. Modification des conditions</h2>
          <p>
            FasoShop se réserve le droit de modifier les présentes conditions à tout moment,
            les utilisateurs étant informés des changements substantiels.
          </p>

          <p style={{ color: "var(--ink-400)", fontSize: "0.85rem", marginTop: 24 }}>
            Document à faire valider par un professionnel du droit avant mise en production définitive.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
