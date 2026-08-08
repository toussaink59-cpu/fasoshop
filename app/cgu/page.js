import Link from "next/link";
import KimoxaLogo from "@/app/components/KimoxaLogo";

export const metadata = {
  title: "Conditions Générales d'Utilisation — Kimoxa",
};

export default function CGUPage() {
  return (
    <div className="shell">
      <div className="legal-topbar">
        <Link href="/" aria-label="Accueil Kimoxa">
          <KimoxaLogo size={30} />
        </Link>
        <span className="legal-topbar-link">
          Déjà inscrit ? <Link href="/login">Se connecter</Link>
        </span>
      </div>

      <div className="legal-wrap">
        <div className="legal-header">
          <span className="legal-tag">Document légal</span>
          <h1>Conditions Générales d'Utilisation</h1>
          <p className="legal-subtitle">
            En vigueur au 09 août 2026 — Version 1.0
          </p>
        </div>

        <div className="legal-summary">
          <h2>📋 Résumé rapide (5 points essentiels)</h2>
          <ul>
            <li>🔒 <strong>Paiement séquestré</strong> : votre argent est libéré au vendeur uniquement à la livraison</li>
            <li>↩️ <strong>Retours 7 jours</strong> : satisfait ou remboursé si le produit ne correspond pas</li>
            <li>🪪 <strong>Vendeurs vérifiés</strong> : chaque vendeur a fourni une pièce d'identité</li>
            <li>💬 <strong>Support 7j/7</strong> : litiges résolus en moins de 48h</li>
            <li>🇧🇫 <strong>Droit applicable</strong> : Burkina Faso, tribunaux de Ouagadougou</li>
          </ul>
        </div>

        <section className="legal-section">
          <h2>1. Objet</h2>
          <p>
            Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») régissent l'accès
            et l'utilisation de la plateforme en ligne <strong>Kimoxa</strong>, accessible à l'adresse
            <em> kimoxa.bf</em> et via ses applications mobiles. Kimoxa est une marketplace
            multi-vendeurs qui met en relation des acheteurs et des vendeurs vérifiés au Burkina
            Faso et dans la sous-région UEMOA.
          </p>
          <p>
            L'utilisation de la plateforme implique l'acceptation pleine et entière des présentes CGU
            par tout utilisateur, qu'il soit acheteur ou simple visiteur.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Inscription et compte utilisateur</h2>
          <p>
            L'inscription est ouverte à toute personne physique âgée d'au moins <strong>15 ans</strong>.
            L'utilisateur s'engage à fournir des informations exactes, complètes et à jour :
          </p>
          <ul>
            <li>Prénom, nom, email, téléphone</li>
            <li>Date de naissance</li>
            <li>Nationalité et pays de résidence</li>
            <li>Mot de passe sécurisé (minimum 8 caractères)</li>
          </ul>
          <p>
            L'utilisateur est seul responsable de la confidentialité de ses identifiants. Toute
            activité réalisée depuis son compte lui est imputable.
          </p>
        </section>

        <section className="legal-section">
          <h2>3. Achat sur Kimoxa</h2>
          <h3>3.1. Processus de commande</h3>
          <p>
            L'acheteur sélectionne un ou plusieurs produits, choisit son mode de paiement
            (Mobile Money ou paiement à la livraison), fournit une adresse de livraison et un
            numéro de téléphone, puis valide sa commande.
          </p>

          <h3>3.2. Paiement séquestré</h3>
          <p>
            <strong>Kimoxa agit en tant qu'intermédiaire de paiement sécurisé.</strong> Lorsque
            l'acheteur paie en ligne (Mobile Money), les fonds sont <strong>séquestrés</strong> par
            Kimoxa et ne sont libérés au vendeur qu'après confirmation de la bonne réception de
            la commande par l'acheteur. Ce mécanisme protège l'acheteur contre les arnaques.
          </p>

          <h3>3.3. Confirmation de réception</h3>
          <p>
            L'acheteur dispose de <strong>7 jours</strong> après la livraison pour confirmer la
            réception. En l'absence de confirmation dans ce délai, le paiement est automatiquement
            libéré au vendeur.
          </p>
        </section>

        <section className="legal-section">
          <h2>4. Droit de rétractation et retours</h2>
          <p>
            Conformément aux bonnes pratiques du commerce électronique en Afrique de l'Ouest,
            l'acheteur bénéficie d'un <strong>délai de 7 jours</strong> à compter de la livraison
            pour :
          </p>
          <ul>
            <li>Retourner un produit non conforme à sa description</li>
            <li>Demander un remboursement en cas de défaut avéré</li>
            <li>Signaler une fraude ou une contrefaçon</li>
          </ul>
          <p>
            Les frais de retour sont à la charge du vendeur en cas de non-conformité, et à la
            charge de l'acheteur en cas de changement d'avis.
          </p>
        </section>

        <section className="legal-section">
          <h2>5. Obligations de l'acheteur</h2>
          <ul>
            <li>Fournir une adresse de livraison exacte et accessible</li>
            <li>Être joignable au numéro fourni lors de la commande</li>
            <li>Confirmer la réception dans les 7 jours</li>
            <li>Ne pas utiliser la plateforme à des fins frauduleuses</li>
            <li>Respecter les vendeurs et le personnel de support</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>6. Responsabilité de Kimoxa</h2>
          <p>
            Kimoxa est un <strong>intermédiaire technique</strong> entre acheteurs et vendeurs.
            Kimoxa n'est pas partie au contrat de vente et ne saurait être tenue responsable :
          </p>
          <ul>
            <li>De la qualité intrinsèque des produits vendus</li>
            <li>Des litiges entre acheteur et vendeur résolus à l'amiable</li>
            <li>Des retards de livraison indépendants de sa volonté</li>
          </ul>
          <p>
            Kimoxa s'engage toutefois à mettre en œuvre tous les moyens raisonnables pour
            vérifier l'identité des vendeurs et sécuriser les transactions.
          </p>
        </section>

        <section className="legal-section">
          <h2>7. Données personnelles</h2>
          <p>
            Les données collectées lors de l'inscription (identité, téléphone, adresse, historique
            de commandes) sont traitées conformément à la <strong>loi n° 001-2021/PORTANT
            PROTECTION DES DONNÉES À CARACTÈRE PERSONNEL</strong> du Burkina Faso et aux
            standards de l'UEMOA.
          </p>
          <p>
            L'utilisateur dispose d'un droit d'accès, de rectification et de suppression de ses
            données sur simple demande à <strong>support@kimoxa.bf</strong>.
          </p>
        </section>

        <section className="legal-section">
          <h2>8. Propriété intellectuelle</h2>
          <p>
            Le logo Kimoxa, le nom de domaine, les textes, graphismes, images et la charte
            graphique sont la propriété exclusive de Kimoxa. Toute reproduction, même partielle,
            est interdite sans autorisation écrite préalable.
          </p>
        </section>

        <section className="legal-section">
          <h2>9. Modification des CGU</h2>
          <p>
            Kimoxa se réserve le droit de modifier les présentes CGU à tout moment. Les
            utilisateurs en seront informés par email ou notification dans l'application. La
            poursuite de l'utilisation vaut acceptation des nouvelles conditions.
          </p>
        </section>

        <section className="legal-section">
          <h2>10. Droit applicable et litiges</h2>
          <p>
            Les présentes CGU sont régies par le <strong>droit burkinabè</strong>. En cas de
            litige, les parties s'engagent à rechercher une solution amiable via le support
            Kimoxa. À défaut, les tribunaux compétents de <strong>Ouagadougou</strong> seront
            seuls compétents.
          </p>
        </section>

        <div className="legal-contact">
          <h2>📞 Contact</h2>
          <p>
            Pour toute question relative aux présentes CGU :
          </p>
          <ul>
            <li>✉️ <strong>support@kimoxa.bf</strong></li>
            <li>📞 Support client : 7j/7 via la messagerie intégrée</li>
            <li>🏢 Kimoxa — Ouagadougou, Burkina Faso</li>
          </ul>
        </div>

        <div className="legal-cta">
          <Link href="/register" className="btn btn-primary">
            Créer mon compte →
          </Link>
          <Link href="/login" className="btn btn-ghost">
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}
