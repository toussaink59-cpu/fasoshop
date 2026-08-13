import Link from "next/link";
import KimoxaLogo from "@/app/components/KimoxaLogo";

export const metadata = {
  title: "Conditions Générales de Vente — Kimoxa",
};

export default function CGVPage() {
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
          <span className="legal-tag">Document légal — Vendeurs</span>
          <h1>Conditions Générales de Vente</h1>
          <p className="legal-subtitle">
            En vigueur au 09 août 2026 — Version 1.0
          </p>
        </div>

        <div className="legal-summary">
          <h2>💼 Résumé pour les vendeurs</h2>
          <ul>
            <li>🪪 <strong>Vérification d'identité obligatoire</strong> avant de vendre</li>
            <li>💰 <strong>Commission Kimoxa : 9%</strong> sur chaque vente</li>
            <li>🔒 <strong>Paiement séquestré</strong> : déblocage après livraison confirmée</li>
            <li>💸 <strong>Payouts Mobile Money</strong> sans limite une fois vérifié</li>
            <li>🚫 <strong>Produits interdits</strong> : contrefaçons, armes, médicaments non autorisés</li>
          </ul>
        </div>

        <section className="legal-section">
          <h2>1. Objet</h2>
          <p>
            Les présentes Conditions Générales de Vente (CGV) régissent les relations entre
            <strong> Kimoxa</strong> (la marketplace) et les <strong>vendeurs professionnels ou
            particuliers</strong> qui utilisent la plateforme pour vendre des produits aux
            acheteurs inscrits.
          </p>
          <p>
            En créant un compte vendeur et en publiant des produits, le vendeur accepte sans
            réserve les présentes CGV.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Inscription vendeur et vérification</h2>
          <h3>2.1. Création de compte</h3>
          <p>
            Toute personne physique ou morale souhaitant vendre sur Kimoxa doit :
          </p>
          <ul>
            <li>Créer un compte avec ses informations réelles (identité, email, téléphone)</li>
            <li>Déclarer le nom de sa boutique et sa catégorie principale</li>
            <li>Fournir une <strong>pièce d'identité valide</strong> (CNI, passeport ou permis)</li>
          </ul>

          <h3>2.2. Vérification d'identité (KYC)</h3>
          <p>
            <strong>Aucune vente n'est possible avant validation de la pièce d'identité</strong>
            par l'équipe Kimoxa. Cette vérification, obligatoire, protège les acheteurs contre
            la fraude et permet au vendeur de bénéficier du statut « Vendeur Vérifié » (badge ✅).
          </p>
          <p>
            Le délai moyen de vérification est de <strong>moins de 24 heures</strong> ouvrées.
            En cas de rejet, le vendeur reçoit un motif et peut resoumettre.
          </p>
        </section>

        <section className="legal-section">
          <h2>3. Commission Kimoxa</h2>
          <p>
            En contrepartie de la mise à disposition de la plateforme, des outils de paiement,
            de la vérification des acheteurs et du support client, Kimoxa prélève une
            <strong> commission de 9%</strong> sur le montant brut de chaque vente.
          </p>

          <h3>3.1. Exemple de calcul</h3>
          <table className="legal-table">
            <thead>
              <tr>
                <th>Article</th>
                <th>Montant</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Prix de vente (brut)</td>
                <td><strong>10 000 FCFA</strong></td>
              </tr>
              <tr>
                <td>Commission Kimoxa (9%)</td>
                <td>− 550 FCFA</td>
              </tr>
              <tr>
                <td><strong>Net vendeur</strong></td>
                <td><strong>9 450 FCFA</strong></td>
              </tr>
            </tbody>
          </table>

          <h3>3.2. Transparence</h3>
          <p>
            Le détail de chaque vente (brut, commission, net) est visible en temps réel dans le
            tableau de bord vendeur, section <strong>« 💰 Mes gains »</strong>.
          </p>
        </section>

        <section className="legal-section">
          <h2>4. Système de paiement séquestré</h2>
          <p>
            Pour protéger acheteurs et vendeurs, Kimoxa applique un mécanisme de séquestre :
          </p>
          <ol>
            <li>L'acheteur paie → <strong>l'argent est séquestré</strong> par Kimoxa</li>
            <li>Le vendeur expédie la commande</li>
            <li>L'acheteur confirme la réception (bouton « ✅ J'ai reçu ma commande »)</li>
            <li>Le montant net (après commission) est <strong>débloqué</strong> et devient disponible pour payout</li>
          </ol>
          <p>
            En cas de litige, Kimoxa arbitre et peut retenir les fonds jusqu'à résolution.
          </p>
        </section>

        <section className="legal-section">
          <h2>5. Payouts (versements aux vendeurs)</h2>
          <h3>5.1. Conditions de payout</h3>
          <p>Le vendeur peut demander le versement de ses gains dès lors que :</p>
          <ul>
            <li>Sa boutique est <strong>vérifiée et active</strong></li>
            <li>Il a renseigné son <strong>numéro Mobile Money</strong> (Orange, Moov, Wave, MTN)</li>
            <li>Les commandes correspondantes sont <strong>livrées et confirmées</strong></li>
          </ul>

          <h3>5.2. Délais</h3>
          <p>
            Les payouts sont traités par l'équipe Kimoxa dans un délai de <strong>24 à 72 heures
            ouvrées</strong>. Aucun plafond de vente ou de gain n'est appliqué aux vendeurs
            vérifiés.
          </p>
        </section>

        <section className="legal-section">
          <h2>6. Obligations du vendeur</h2>
          <ul>
            <li><strong>Exactitude des annonces</strong> : description, photos, prix, stock</li>
            <li><strong>Livraison dans les délais</strong> annoncés (généralement 24-72h)</li>
            <li><strong>Réactivité</strong> : répondre aux messages clients sous 24h</li>
            <li><strong>Produits conformes</strong> à la législation burkinabè</li>
            <li><strong>Facturation</strong> : émettre une facture pour chaque vente (via Kimoxa)</li>
            <li><strong>Fiscalité</strong> : déclarer ses revenus selon la réglementation en vigueur</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>7. Produits interdits</h2>
          <p>Sont strictement interdits à la vente sur Kimoxa :</p>
          <ul>
            <li>Contrefaçons et produits piratés</li>
            <li>Armes, munitions, explosifs</li>
            <li>Drogues et substances illicites</li>
            <li>Médicaments sans autorisation de mise sur le marché</li>
            <li>Produits volés ou d'origine douteuse</li>
            <li>Contenus à caractère pornographique ou haineux</li>
          </ul>
          <p>
            Tout manquement entraîne la <strong>suspension immédiate</strong> de la boutique et
            le gel des fonds.
          </p>
        </section>

        <section className="legal-section">
          <h2>8. Suspension et résiliation</h2>
          <p>Kimoxa se réserve le droit de suspendre ou résilier un compte vendeur en cas de :</p>
          <ul>
            <li>Fraude ou tentative de fraude</li>
            <li>Non-respect répété des obligations</li>
            <li>Plaintes fondées d'acheteurs</li>
            <li>Vente de produits interdits</li>
            <li>Inactivité prolongée (plus de 12 mois)</li>
          </ul>
          <p>
            Le vendeur peut contester la décision en écrivant à <strong>support@kimoxa.bf</strong>.
          </p>
        </section>

        <section className="legal-section">
          <h2>9. Responsabilité du vendeur</h2>
          <p>
            Le vendeur est seul responsable de la conformité de ses produits, de leur qualité,
            et du respect de la législation applicable (notamment fiscale et douanière). Il
            garantit Kimoxa contre toute réclamation d'un tiers relative à ses produits.
          </p>
        </section>

        <section className="legal-section">
          <h2>10. Propriété intellectuelle</h2>
          <p>
            Le vendeur conserve la propriété intellectuelle de ses contenus (photos, descriptions).
            Il concède à Kimoxa une licence non exclusive, gratuite et mondiale pour afficher
            ces contenus sur la plateforme et dans ses communications marketing.
          </p>
        </section>

        <section className="legal-section">
          <h2>11. Modification des CGV</h2>
          <p>
            Kimoxa peut modifier les présentes CGV à tout moment. Le vendeur en sera informé
            par email. La poursuite de l'activité sur la plateforme après modification vaut
            acceptation des nouvelles conditions.
          </p>
        </section>

        <section className="legal-section">
          <h2>12. Droit applicable</h2>
          <p>
            Les présentes CGV sont régies par le <strong>droit burkinabè</strong>. En cas de
            litige, les parties s'engagent à rechercher une solution amiable. À défaut, les
            tribunaux compétents de <strong>Ouagadougou</strong> seront seuls compétents.
          </p>
        </section>

        <div className="legal-contact">
          <h2>📞 Contact vendeur</h2>
          <ul>
            <li>✉️ <strong>vendeurs@kimoxa.bf</strong></li>
            <li>💬 Support prioritaire via la messagerie du dashboard vendeur</li>
            <li>🏢 Kimoxa — Ouagadougou, Burkina Faso</li>
          </ul>
        </div>

        <div className="legal-cta">
          <Link href="/register?role=vendor" className="btn btn-primary">
            Ouvrir ma boutique →
          </Link>
          <Link href="/" className="btn btn-ghost">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
