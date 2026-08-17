import Link from "next/link";
import KimoxaLogo from "@/app/components/KimoxaLogo";

export const metadata = { title: "Conditions Générales de Vente — Kimoxa" };

export default function CGVPage() {
  return (
    <div className="shell">
      <div className="legal-topbar">
        <Link href="/" aria-label="Accueil Kimoxa"><KimoxaLogo size={30} /></Link>
        <span className="legal-topbar-link">Déjà inscrit ? <Link href="/login">Se connecter</Link></span>
      </div>
      <div className="legal-wrap">
        <div className="legal-header">
          <span className="legal-tag">Document légal — Marketplace Kimoxa</span>
          <h1>Conditions Générales de Vente</h1>
          <p className="legal-subtitle">En vigueur au 17 août 2026 — Version 3.0</p>
        </div>
        <div className="legal-summary">
          <h2>🛍️ Comprendre la vente sur Kimoxa</h2>
          <ul>
            <li>🤝 <strong>Marketplace</strong> : sauf indication contraire sur une offre, la vente est conclue entre l’acheteur et le vendeur identifié.</li>
            <li>🪪 <strong>Vendeurs vérifiés</strong> : les boutiques doivent respecter le processus de vérification et les règles de la plateforme.</li>
            <li>📦 <strong>Stock réel</strong> : un produit sans stock disponible n’est pas présenté comme disponible dans le catalogue public.</li>
            <li>💰 <strong>Prix affichés</strong> : le montant dû par l’acheteur et les frais applicables sont présentés avant validation de la commande.</li>
            <li>↩️ <strong>Retours</strong> : le signalement rapide d’un problème est recommandé sans limiter les droits impératifs applicables.</li>
          </ul>
        </div>
        <section className="legal-section">
          <h2>A. Conditions applicables aux acheteurs</h2>
          <h3>1. Objet et rôle de Kimoxa</h3>
          <p>Kimoxa exploite une marketplace multi-vendeurs permettant aux acheteurs de découvrir des offres, de passer commande et d’utiliser les services de paiement et de suivi proposés par la plateforme.</p>
          <p>Sauf indication contraire explicite sur une offre, <strong>le vendeur identifié sur la fiche produit est le vendeur contractuel</strong>. Kimoxa fournit l’intermédiation technique et les services de plateforme ; il n’est pas, par principe, propriétaire ni vendeur des produits proposés par les boutiques tierces.</p>
          <h3>2. Offres, prix et disponibilité</h3>
          <p>Le vendeur est responsable de l’exactitude de la fiche produit, notamment de la dénomination, des caractéristiques, des images, du prix, de la quantité disponible et des informations nécessaires à l’achat.</p>
          <p>Les produits doivent respecter les règles de Kimoxa et la législation applicable. Kimoxa peut retirer ou suspendre une offre lorsqu’elle est interdite, trompeuse, indisponible ou contraire aux règles de la marketplace.</p>
          <p>Le prix affiché et les frais applicables sont présentés de manière claire avant la validation finale. Les frais de livraison, taxes ou autres frais connus à ce stade sont indiqués dans le parcours de commande.</p>
          <h3>3. Commande et formation de la vente</h3>
          <p>L’acheteur sélectionne ses produits, vérifie le récapitulatif, renseigne les informations nécessaires et choisit un moyen de paiement parmi ceux proposés. La commande est ensuite enregistrée et un récapitulatif électronique peut être conservé.</p>
          <p>La vente est formée selon le processus de commande affiché par Kimoxa et les conditions applicables au vendeur. La disponibilité peut évoluer jusqu’à la validation finale ; aucune commande ne peut être exécutée au-delà du stock effectivement disponible.</p>
          <h3>4. Paiement</h3>
          <p>Kimoxa peut proposer plusieurs moyens de paiement selon la commande et le contexte, notamment le paiement mobile et, lorsque cette option est proposée, le paiement à la livraison. Le moyen effectivement disponible est indiqué pendant le parcours de commande.</p>
          <p>Pour les paiements en ligne, Kimoxa applique des mécanismes de suivi de l’état de la commande et du paiement. La disponibilité des fonds pour le vendeur dépend du statut de la commande et des règles de versement applicables.</p>
          <h3>5. Livraison</h3>
          <p>Le vendeur est responsable de la préparation et de l’expédition selon les modalités annoncées. Les délais communiqués doivent être réalistes et respecter les obligations légales applicables.</p>
          <p>En cas de retard important, d’impossibilité d’exécution, d’adresse incorrecte, de livraison partielle ou de problème de transport, l’acheteur peut utiliser le parcours de réclamation de Kimoxa et les droits qui lui sont reconnus par la législation applicable.</p>
          <h3>6. Réception, retours et non-conformité</h3>
          <p>Nous recommandons de signaler dans les <strong>48 heures</strong> suivant la réception tout produit manifestement endommagé, incomplet ou différent de la commande, avec les éléments utiles à l’examen du dossier (photos, description, etc.).</p>
          <p>Cette procédure rapide ne limite pas les droits impératifs prévus par la loi. Pour les contrats de commerce électronique entrant dans son champ, les règles burkinabè applicables peuvent notamment prévoir un délai de rétractation pouvant aller jusqu’à <strong>sept jours ouvrables</strong>, sous réserve des exceptions légales et de la nature de la transaction.</p>
          <p>Les biens personnalisés, susceptibles de se détériorer rapidement ou entrant dans une autre exception légale peuvent notamment être exclus du droit de rétractation. Les règles impératives applicables prévalent sur toute clause contraire.</p>
          <h3>7. Remboursements et réclamations</h3>
          <p>Lorsqu’un remboursement est dû, son traitement dépend du motif, du statut de la commande, du moyen de paiement et des règles légales applicables.</p>
          <p>L’acheteur doit utiliser en priorité la messagerie ou le parcours de réclamation disponible depuis sa commande. Kimoxa peut intervenir dans le cadre de son rôle d’intermédiation et de médiation de la marketplace, sans se substituer au vendeur lorsque celui-ci est le responsable contractuel de la vente.</p>
        </section>
        <section className="legal-section">
          <h2>B. Conditions applicables aux vendeurs</h2>
          <h3>8. Vérification et activation de la boutique</h3>
          <p>Le vendeur fournit des informations exactes sur son identité, son activité et sa boutique et respecte le processus de vérification demandé par Kimoxa. L’activation ou le maintien d’une boutique peut être suspendu lorsque les informations requises ne sont pas fournies, sont inexactes ou lorsqu’une règle de la marketplace est violée.</p>
          <h3>9. Obligations du vendeur</h3>
          <ul>
            <li>Publier des produits licites, authentiques et conformes à leur description ;</li>
            <li>Maintenir les prix, caractéristiques et stocks à jour ;</li>
            <li>Ne pas proposer un produit interdit, contrefait, volé ou d’origine frauduleuse ;</li>
            <li>Préparer et expédier les commandes dans les délais annoncés ;</li>
            <li>Traiter les demandes clients et réclamations de bonne foi ;</li>
            <li>Respecter les obligations fiscales, commerciales, de sécurité et réglementaires qui lui incombent ;</li>
            <li>Coopérer avec Kimoxa en cas de litige, contrôle ou demande d’information légitime.</li>
          </ul>
          <h3>10. Commission et rémunération de Kimoxa</h3>
          <p>La commission de Kimoxa est une rémunération due par le vendeur selon les conditions commerciales qui lui sont applicables. <strong>Le taux de 9 % actuellement indiqué par la plateforme</strong> s’applique aux ventes réalisées via Kimoxa selon ces conditions.</p>
          <p>Cette commission n’est pas, par elle-même, un frais supplémentaire ajouté au prix affiché à l’acheteur. Les frais effectivement dus par l’acheteur sont ceux présentés dans son parcours de commande.</p>
          <table className="legal-table"><thead><tr><th>Exemple</th><th>Montant</th></tr></thead><tbody><tr><td>Prix de vente brut</td><td><strong>10 000 FCFA</strong></td></tr><tr><td>Commission Kimoxa (9%)</td><td>− 900 FCFA</td></tr><tr><td><strong>Montant vendeur avant autres ajustements éventuels</strong></td><td><strong>9 100 FCFA</strong></td></tr></tbody></table>
          <h3>11. Versements</h3>
          <p>Le vendeur peut demander le versement des montants devenus disponibles selon les règles de Kimoxa, notamment après les étapes de traitement et de sécurisation prévues. Les éventuels frais ou délais de traitement sont communiqués au vendeur dans son espace.</p>
          <p>Les obligations fiscales et comptables liées aux ventes, aux commissions et aux sommes collectées doivent être déterminées et respectées conformément à la réglementation applicable au vendeur et, le cas échéant, aux obligations propres à la plateforme.</p>
          <h3>12. Produits interdits et modération</h3>
          <p>Sont notamment interdits les produits ou contenus contrefaits ou piratés, illicites, volés ou frauduleux, soumis à une autorisation non détenue, présentant un risque grave pour la sécurité, ou contraires à la loi ou aux règles de Kimoxa.</p>
          <p>Kimoxa peut retirer une annonce, suspendre une boutique ou prendre toute mesure nécessaire lorsqu’une violation est constatée.</p>
          <h3>13. Contenus et propriété intellectuelle</h3>
          <p>Le vendeur reste titulaire des droits sur ses photographies, descriptions et autres contenus. Il autorise Kimoxa à les reproduire et représenter dans la mesure nécessaire au fonctionnement, à l’affichage, à la promotion et à la sécurité de la marketplace.</p>
        </section>
        <section className="legal-section">
          <h2>C. Règles communes de la marketplace</h2>
          <h3>14. Stock et disponibilité publique</h3>
          <p>Kimoxa privilégie la cohérence entre le catalogue public et le stock réellement disponible. Un produit dont la quantité disponible est nulle n’est pas présenté comme achetable dans le catalogue public. Cette règle n’empêche pas le vendeur de gérer son réassort ou de republier l’offre lorsqu’elle redevient effectivement disponible.</p>
          <h3>15. Sécurité et suspension</h3>
          <p>Kimoxa peut prendre des mesures de sécurité, limiter certaines fonctionnalités ou suspendre un compte ou une boutique lorsqu’un risque de fraude, d’abus, d’atteinte à la sécurité ou de violation des conditions est identifié. Les mesures peuvent être temporaires ou définitives selon la gravité et les règles applicables.</p>
          <h3>16. Réclamations et médiation</h3>
          <p>Les utilisateurs sont invités à utiliser les mécanismes de réclamation de Kimoxa avant toute escalade. Kimoxa peut faciliter le dialogue entre acheteur et vendeur et examiner les éléments disponibles dans le cadre de son rôle d’intermédiation.</p>
          <p>Cette médiation interne ne prive pas une partie des droits ou recours qui lui sont accordés par la loi.</p>
          <h3>17. Modification des conditions</h3>
          <p>Les présentes conditions peuvent évoluer pour tenir compte du fonctionnement de la marketplace, de nouveaux services ou de la réglementation. La version publiée au moment concerné est la version de référence, sous réserve des règles impératives applicables aux contrats déjà conclus.</p>
          <h3>18. Droit applicable</h3>
          <p>Les présentes conditions sont rédigées pour un service exploité depuis le Burkina Faso et sont soumises au droit applicable au Burkina Faso, sous réserve des dispositions impératives susceptibles de protéger l’acheteur ou de s’appliquer à une transaction déterminée.</p>
        </section>
        <div className="legal-contact"><h2>📞 Contact</h2><ul><li>✉️ <strong>support@kimoxa.bf</strong></li><li>💬 Support via la messagerie intégrée</li><li>🏢 Kimoxa — Burkina Faso</li></ul></div>
        <div className="legal-cta"><Link href="/register?role=vendor" className="btn btn-primary">Vendre sur Kimoxa →</Link><Link href="/" className="btn btn-ghost">Retour à l’accueil</Link></div>
      </div>
    </div>
  );
}
