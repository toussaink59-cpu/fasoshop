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
 <p className="legal-subtitle">En vigueur au 17 août 2026 — Version 2.0</p>
 </div>

 <div className="legal-summary">
 <h2> L'essentiel</h2>
 <ul>
 <li> <strong>Kimoxa est une marketplace</strong> : les vendeurs restent responsables de leurs offres et ventes.</li>
 <li> <strong>Catalogue public</strong> : seuls les produits éligibles et disponibles sont présentés comme achetables.</li>
 <li> <strong>Vendeurs vérifiés</strong> : la vente est soumise au processus de vérification de la plateforme.</li>
 <li> <strong>Paiements</strong> : les moyens proposés sont ceux affichés lors de la commande.</li>
 <li> <strong>Confiance et sécurité</strong> : fraude, contrefaçon et contournement des contrôles sont interdits.</li>
 </ul>
 </div>

 <section className="legal-section">
 <h2>1. Objet et rôle de Kimoxa</h2>
 <p>
 Les présentes CGU régissent l'accès et l'utilisation de la plateforme <strong>Kimoxa</strong>,
 marketplace multi-vendeurs destinée à mettre en relation des acheteurs et des vendeurs.
 </p>
 <p>
 Kimoxa fournit l'infrastructure technique de découverte des produits, de gestion des
 comptes, de commande, de paiement et de suivi. Sauf disposition contraire expressément
 indiquée, Kimoxa n'est pas le vendeur des produits publiés par les boutiques présentes
 sur la plateforme.
 </p>
 </section>

 <section className="legal-section">
 <h2>2. Visiteurs, acheteurs et vendeurs</h2>
 <p>
 La consultation du catalogue est accessible aux visiteurs. Certaines fonctions, notamment
 la commande, le suivi des achats, les favoris ou l'espace vendeur, nécessitent un compte.
 </p>
 <p>
 L'utilisateur s'engage à fournir des informations exactes, à maintenir ses coordonnées à
 jour et à protéger ses identifiants. Il reste responsable des actions effectuées depuis
 son compte, sous réserve des mesures de sécurité et de récupération proposées par Kimoxa.
 </p>
 </section>

 <section className="legal-section">
 <h2>3. Fonctionnement de la marketplace</h2>
 <p>
 Les produits, prix, stocks, descriptions et conditions particulières sont publiés par les
 vendeurs. Une offre peut être retirée, suspendue ou devenir indisponible, notamment en
 cas de rupture de stock, de suspension de boutique ou de non-conformité.
 </p>
 <p>
 Les produits en rupture ne sont pas destinés à être présentés comme disponibles à l'achat
 dans le catalogue public.
 </p>
 </section>

 <section className="legal-section">
 <h2>4. Commandes et paiements</h2>
 <p>
 Avant validation d'une commande, l'acheteur peut consulter les informations essentielles
 disponibles sur l'offre et le récapitulatif de son panier. Les modalités de paiement,
 les frais applicables et les informations de livraison sont celles affichées au moment de
 la commande.
 </p>
 <p>
 Kimoxa peut proposer notamment le paiement mobile et le paiement à la livraison selon le
 pays, le vendeur et la commande. Les moyens effectivement disponibles sont ceux présentés
 lors du parcours de paiement.
 </p>
 </section>

 <section className="legal-section">
 <h2>5. Retours, réclamations et litiges</h2>
 <p>
 Les conditions de retour dépendent de la nature du produit, du motif du retour et des
 règles applicables à la vente. Un signalement rapide est recommandé, notamment dans les
 <strong> 48 heures</strong> suivant la réception lorsqu'un produit est endommagé, incomplet
 ou manifestement non conforme.
 </p>
 <p>
 Cette recommandation de 48 heures ne prive pas l'acheteur des droits impératifs qui lui
 sont accordés par la législation applicable. Les exceptions et modalités particulières
 sont précisées dans les Conditions Générales de Vente et la politique de retour.
 </p>
 </section>

 <section className="legal-section">
 <h2>6. Règles applicables aux vendeurs</h2>
 <p>
 Un vendeur doit respecter le processus de vérification de Kimoxa avant l'activation de sa
 capacité à vendre. Il doit publier des informations exactes sur ses produits, maintenir
 ses stocks à jour, respecter les délais annoncés et fournir des produits conformes à la
 législation applicable.
 </p>
 <p>
 Les produits interdits, contrefaits, frauduleux ou présentant un risque pour les utilisateurs
 peuvent être retirés. Kimoxa peut suspendre une boutique ou limiter certaines fonctions en
 cas de violation des règles.
 </p>
 </section>

 <section className="legal-section">
 <h2>7. Avis, messages et contenus</h2>
 <p>
 Les utilisateurs ne doivent publier que des contenus licites, pertinents et dont ils ont
 le droit d'autoriser la publication. Sont interdits notamment les contenus frauduleux,
 diffamatoires, haineux, pornographiques, contrefaisants ou destinés à contourner les
 mécanismes de sécurité de la plateforme.
 </p>
 <p>
 Kimoxa peut retirer un contenu ou restreindre un compte lorsqu'une violation est identifiée,
 dans le respect des règles applicables.
 </p>
 </section>

 <section className="legal-section">
 <h2>8. Sécurité et usages interdits</h2>
 <ul>
 <li>Usurper l'identité d'un autre utilisateur ou manipuler les données d'identification</li>
 <li>Contourner l'authentification, les contrôles d'accès ou les limitations de sécurité</li>
 <li>Automatiser abusivement les requêtes, créer des comptes frauduleux ou pratiquer du credential stuffing</li>
 <li>Manipuler les stocks, commandes, paiements, avis ou commissions</li>
 <li>Utiliser Kimoxa pour une activité illicite ou pour vendre des produits interdits</li>
 </ul>
 </section>

 <section className="legal-section">
 <h2>9. Données personnelles</h2>
 <p>
 Kimoxa traite les données personnelles nécessaires au fonctionnement du service, notamment
 pour les comptes, commandes, livraisons, paiements, sécurité et support. Les traitements
 sont encadrés par la <strong>loi n°001-2021/AN portant protection des personnes à l'égard
 du traitement des données à caractère personnel</strong> du Burkina Faso, ainsi que par
 les textes applicables.
 </p>
 <p>
 Les demandes relatives aux données personnelles peuvent être adressées à
 <strong> support@kimoxa.bf</strong>, sous réserve des vérifications nécessaires.
 </p>
 </section>

 <section className="legal-section">
 <h2>10. Propriété intellectuelle</h2>
 <p>
 Le nom, le logo, l'interface, les textes, éléments graphiques et composants propres à
 Kimoxa sont protégés par les règles applicables de propriété intellectuelle. Les vendeurs
 restent titulaires des droits sur leurs contenus et accordent à Kimoxa les droits nécessaires
 à leur affichage et à l'exploitation du service.
 </p>
 </section>

 <section className="legal-section">
 <h2>11. Disponibilité et responsabilité</h2>
 <p>
 Kimoxa met en œuvre des moyens raisonnables pour maintenir la plateforme disponible et
 sécurisée. Des interruptions peuvent toutefois survenir pour maintenance, mise à jour,
 incident technique ou événement indépendant de la volonté de Kimoxa.
 </p>
 <p>
 Le vendeur demeure responsable des caractéristiques, de la conformité, de la qualité et
 de la livraison de ses produits, sans préjudice des obligations légales qui peuvent peser
 sur Kimoxa en tant qu'opérateur de la plateforme.
 </p>
 </section>

 <section className="legal-section">
 <h2>12. Modification des CGU</h2>
 <p>
 Kimoxa peut faire évoluer les présentes CGU pour tenir compte des changements du service,
 de la réglementation ou de la sécurité. La version en vigueur est publiée sur cette page.
 Lorsque la loi ou la nature de la modification l'exige, une information complémentaire
 sera fournie aux utilisateurs concernés.
 </p>
 </section>

 <section className="legal-section">
 <h2>13. Droit applicable et règlement des litiges</h2>
 <p>
 Les présentes CGU sont rédigées pour un service exploité depuis le Burkina Faso et sont
 soumises au droit applicable au Burkina Faso, sous réserve des règles impératives qui
 pourraient s'appliquer à un utilisateur ou à une transaction donnée.
 </p>
 <p>
 Les utilisateurs sont invités à contacter d'abord Kimoxa afin de rechercher une solution
 amiable avant toute autre démarche, lorsque cela est possible.
 </p>
 </section>

 <div className="legal-contact">
 <h2> Contact</h2>
 <ul>
 <li> <strong>support@kimoxa.bf</strong></li>
 <li> Support via la messagerie intégrée</li>
 <li> Kimoxa — Burkina Faso</li>
 </ul>
 </div>

 <div className="legal-cta">
 <Link href="/register" className="btn btn-primary">Créer mon compte →</Link>
 <Link href="/login" className="btn btn-ghost">Se connecter</Link>
 </div>
 </div>
 </div>
 );
}
