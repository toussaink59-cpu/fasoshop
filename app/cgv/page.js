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
          <span className="legal-tag">Document légal — Acheteurs & vendeurs</span>
          <h1>Conditions Générales de Vente</h1>
          <p className="legal-subtitle">En vigueur au 17 août 2026 — Version 2.0</p>
        </div>

        <div className="legal-summary">
          <h2>🛍️ Le modèle Kimoxa</h2>
          <ul>
            <li>🤝 <strong>Marketplace</strong> : la vente est conclue entre l'acheteur et le vendeur concerné.</li>
            <li>🪪 <strong>Vendeurs vérifiés</strong> : l'activité de vente est soumise au processus de vérification Kimoxa.</li>
            <li>💰 <strong>Commission vendeur</strong> : 9% sur les ventes réalisées via la plateforme, selon les conditions applicables.</li>
            <li>📦 <strong>Stock réel</strong> : un produit en rupture n'est pas présenté comme disponible à l'achat dans le catalogue public.</li>
            <li>↩️ <strong>Retours</strong> : un signalement sous 48h est recommandé pour les problèmes constatés à réception, sans limiter les droits légaux applicables.</li>
          </ul>
        </div>

        <section className="legal-section">
          <h2>1. Objet et parties à la vente</h2>
          <p>
            Les présentes Conditions Générales de Vente encadrent les commandes effectuées sur
            <strong> Kimoxa</strong>, marketplace multi-vendeurs.
          </p>
          <p>
            Pour chaque commande, le <strong>vendeur identifié sur l'offre</strong> est responsable
            de la vente du produit à l'acheteur. Kimoxa fournit l'intermédiation technique, les
            outils de commande, certains services de paiement et de suivi, ainsi que les mécanismes
            de confiance prévus par la plateforme.
          </p>
          <p>
            Kimoxa n'est pas, par principe, le propriétaire ni le vendeur des produits proposés par
            les boutiques tierces.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Publication des offres</h2>
          <p>
            Le vendeur est responsable de l'exactitude de la fiche produit : dénomination,
            caractéristiques, images, prix, disponibilité, quantité et informations nécessaires à
            l'achat.
          </p>
          <p>
            Les produits doivent respecter les règles de la plateforme et la législation applicable.
            Kimoxa peut retirer ou suspendre une offre lorsqu'elle est interdite, trompeuse,
            indisponible ou contraire aux règles de la marketplace.
          </p>
        </section>

        <section className="legal-section">
          <h2>3. Prix et frais</h2>
          <p>
            Le prix affiché sur une offre doit être présenté de manière claire. Les frais de livraison,
            taxes ou autres frais applicables sont indiqués lorsqu'ils sont connus au moment de la
            commande.
          </p>
          <p>
            La commission de <strong>9%</strong> constitue une rémunération de la plateforme sur les
            ventes réalisées via Kimoxa selon les conditions vendeur applicables. Elle ne constitue
            pas un frais supplémentaire facturé à l'acheteur au-delà du prix et des frais affichés
            lors de sa commande, sauf mention explicite.
          </p>
          <h3>Exemple de calcul de commission</h3>
          <table className="legal-table">
            <thead>
              <tr>
                <th>Élément</th>
                <th>Montant</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Prix de vente brut</td>
                <td><strong>10 000 FCFA</strong></td>
              </tr>
              <tr>
                <td>Commission Kimoxa (9%)</td>
                <td>− 900 FCFA</td>
              </tr>
              <tr>
                <td><strong>Montant vendeur avant autres ajustements éventuels</strong></td>
                <td><strong>9 100 FCFA</strong></td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="legal-section">
          <h2>4. Commande et formation de la vente</h2>
          <p>
            L'acheteur sélectionne les produits, vérifie le récapitulatif, renseigne les informations
            nécessaires à la livraison et choisit un moyen de paiement parmi ceux proposés. La
            commande est ensuite enregistrée et un récapitulatif peut être conservé par voie électronique.
          </p>
          <p>
            La disponibilité d'un produit peut évoluer avant la validation finale. Une commande ne
            peut être exécutée que dans les limites du stock effectivement disponible et des règles
            applicables au vendeur.
          </p>
        </section>

        <section className="legal-section">
          <h2>5. Paiement et sécurisation des transactions</h2>
          <p>
            Kimoxa peut proposer plusieurs moyens de paiement selon la commande et le contexte,
            notamment le paiement mobile et le paiement à la livraison. Le moyen effectivement
            disponible est indiqué pendant le parcours de commande.
          </p>
          <p>
            Pour les paiements en ligne, la plateforme applique des mécanismes de suivi de l'état de
            la commande et du paiement. La disponibilité des fonds pour le vendeur dépend du statut
            de la commande et des règles de versement applicables.
          </p>
        </section>

        <section className="legal-section">
          <h2>6. Livraison</h2>
          <p>
            Le vendeur est responsable de la préparation et de l'expédition de sa commande selon les
            modalités annoncées. Les délais communiqués à l'acheteur doivent être réalistes et respecter
            les obligations légales applicables.
          </p>
          <p>
            En cas de retard important, d'impossibilité d'exécution ou de problème de livraison,
            l'acheteur peut utiliser les mécanismes de réclamation prévus par la plateforme et les
            droits qui lui sont reconnus par la législation applicable.
          </p>
        </section>

        <section className="legal-section">
          <h2>7. Réception, retours et non-conformité</h2>
          <p>
            Nous recommandons à l'acheteur de signaler dans les <strong>48 heures</strong> suivant la
            réception tout produit manifestement endommagé, incomplet ou différent de la commande,
            avec des éléments utiles à l'examen du dossier (photos, description du problème, etc.).
          </p>
          <p>
            Cette procédure rapide ne limite pas les droits impératifs prévus par la loi. Pour les
            contrats de commerce électronique entrant dans son champ, la loi burkinabè sur les services
            et transactions électroniques prévoit notamment un délai de rétractation pouvant aller
            jusqu'à <strong>sept jours ouvrables</strong>, sous réserve des exceptions prévues par la
            loi. Le point de départ et les modalités dépendent de la nature de la vente et des
            informations fournies au consommateur.
          </p>
          <p>
            Les biens personnalisés, susceptibles de se détériorer rapidement ou entrant dans une
            autre exception légale peuvent notamment être exclus du droit de rétractation. Les règles
            impératives applicables prévalent sur toute clause contraire.
          </p>
        </section>

        <section className="legal-section">
          <h2>8. Remboursements et litiges</h2>
          <p>
            Lorsqu'un remboursement est dû, son traitement dépend du motif du remboursement, du statut
            de la commande, du moyen de paiement utilisé et des règles légales applicables.
          </p>
          <p>
            L'acheteur doit d'abord utiliser la messagerie ou le parcours de réclamation disponible
            depuis sa commande. En cas de désaccord avec le vendeur, Kimoxa peut intervenir dans le
            cadre de son rôle d'intermédiation et de médiation de la plateforme.
          </p>
        </section>

        <section className="legal-section">
          <h2>9. Obligations du vendeur</h2>
          <ul>
            <li>Fournir des informations exactes sur son identité et sa boutique</li>
            <li>Respecter le processus de vérification avant l'activation de la vente</li>
            <li>Publier des produits licites, authentiques et conformes à leur description</li>
            <li>Maintenir les prix et les stocks à jour</li>
            <li>Préparer et livrer les commandes dans les délais annoncés</li>
            <li>Traiter les demandes clients et les réclamations de bonne foi</li>
            <li>Respecter les obligations fiscales, commerciales et réglementaires qui lui incombent</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>10. Produits interdits</h2>
          <p>Sont notamment interdits les produits ou contenus :</p>
          <ul>
            <li>contrefaits ou piratés ;</li>
            <li>illicites, volés ou d'origine frauduleuse ;</li>
            <li>dont la vente est soumise à une autorisation non détenue ;</li>
            <li>présentant un risque grave pour la sécurité des utilisateurs ;</li>
            <li>à caractère haineux, pornographique ou autrement interdit par la loi ou les règles de la plateforme.</li>
          </ul>
          <p>
            Kimoxa peut retirer une annonce, suspendre une boutique ou prendre toute mesure nécessaire
            lorsqu'une violation est constatée.
          </p>
        </section>

        <section className="legal-section">
          <h2>11. Versements aux vendeurs</h2>
          <p>
            Le vendeur peut demander le versement des montants devenus disponibles selon les règles de
            Kimoxa, notamment après le traitement de la commande et les étapes de sécurisation prévues.
            Les éventuels frais ou délais de traitement sont communiqués au vendeur dans son espace.
          </p>
        </section>

        <section className="legal-section">
          <h2>12. Propriété intellectuelle</h2>
          <p>
            Le vendeur reste titulaire des droits sur ses photographies, descriptions et autres
            contenus. Il autorise Kimoxa à les reproduire et représenter dans la mesure nécessaire à
            l'exploitation, à la promotion et au fonctionnement de la marketplace.
          </p>
        </section>

        <section className="legal-section">
          <h2>13. Modification des conditions</h2>
          <p>
            Les conditions peuvent évoluer pour tenir compte du fonctionnement de la marketplace,
            des nouveaux services ou de la réglementation. La version applicable est celle publiée
            sur cette page au moment concerné, sous réserve des règles impératives applicables aux
            contrats déjà conclus.
          </p>
        </section>

        <section className="legal-section">
          <h2>14. Droit applicable</h2>
          <p>
            Les présentes conditions sont rédigées pour un service exploité depuis le Burkina Faso et
            sont soumises au droit applicable au Burkina Faso, sous réserve des dispositions impératives
            susceptibles de protéger l'acheteur ou de s'appliquer à une transaction déterminée.
          </p>
        </section>

        <div className="legal-contact">
          <h2>📞 Contact</h2>
          <ul>
            <li>✉️ <strong>support@kimoxa.bf</strong></li>
            <li>💬 Support via la messagerie intégrée</li>
            <li>🏢 Kimoxa — Burkina Faso</li>
          </ul>
        </div>

        <div className="legal-cta">
          <Link href="/register?role=vendor" className="btn btn-primary">Vendre sur Kimoxa →</Link>
          <Link href="/" className="btn btn-ghost">Retour à l'accueil</Link>
        </div>
      </div>
    </div>
  );
}
