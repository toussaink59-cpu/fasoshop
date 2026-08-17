import Footer from "@/app/components/Footer";
import SiteHeader from "@/app/components/SiteHeader";
import BottomNav from "@/app/components/BottomNav";
import { getCurrentUser } from "@/lib/session";
import { getCategoriesTree } from "@/lib/queries/categories";

export const metadata = {
  title: "Retours & remboursements — Kimoxa",
};

export default async function RetoursPage() {
  const [user, categories] = await Promise.all([getCurrentUser(), getCategoriesTree()]);

  return (
    <div className="shell">
      <SiteHeader initialUser={user} categories={categories} />

      <div className="content" style={{ maxWidth: 720, margin: "0 auto" }}>
        <div className="page-header">
          <h1>Retours & remboursements</h1>
          <p>Une procédure simple, sans supprimer les droits prévus par la loi.</p>
        </div>

        <div className="panel">
          <h2>Signaler rapidement un problème</h2>
          <p>
            Nous recommandons de signaler dans les <strong>48 heures suivant la réception</strong>
            tout produit manifestement endommagé, incomplet ou différent de la commande. Cette
            fenêtre facilite la vérification du colis et n'a pas pour objet de supprimer les droits
            légaux dont l'acheteur peut bénéficier.
          </p>

          <h2>Comment procéder</h2>
          <p>
            Depuis votre commande, contactez le vendeur concerné et décrivez précisément le problème.
            Ajoutez si possible des photos du produit, de son emballage et de l'état à réception.
            Si aucun accord n'est trouvé, contactez le support Kimoxa pour une médiation.
          </p>

          <h2>Droit de rétractation</h2>
          <p>
            Pour les ventes de biens entrant dans le champ de la réglementation burkinabè sur les
            transactions électroniques, un droit de rétractation peut s'appliquer dans les conditions
            prévues par la loi, notamment dans un délai pouvant aller jusqu'à <strong>sept jours
            ouvrables</strong>. Des exceptions existent, notamment pour certains biens personnalisés,
            périssables ou déjà détériorés.
          </p>
          <p>
            Les règles impératives applicables à la vente prévalent sur cette politique opérationnelle.
          </p>

          <h2>Produits non éligibles ou exceptions</h2>
          <p>
            Certaines catégories peuvent être exclues du droit de rétractation ou soumises à des
            conditions particulières en raison de leur nature. La situation est appréciée au regard
            du produit, du motif du retour et des règles applicables.
          </p>

          <h2>Remboursement</h2>
          <p>
            Lorsqu'un remboursement est dû, son traitement dépend du motif du retour, du statut de la
            commande et du moyen de paiement utilisé. Kimoxa suit le dossier et applique les modalités
            prévues par la commande, les conditions de vente et la réglementation applicable.
          </p>

          <h2>Litige avec un vendeur</h2>
          <p>
            Si aucun accord n'est trouvé avec le vendeur, utilisez le support Kimoxa afin qu'une
            médiation puisse être organisée dans le cadre du rôle d'intermédiaire de la plateforme.
          </p>

          <p style={{ color: "var(--ink-400)", fontSize: "0.85rem", marginTop: 24 }}>
            Cette politique est une information opérationnelle et doit être lue avec les Conditions
            Générales de Vente et les Conditions Générales d'Utilisation de Kimoxa.
          </p>
        </div>
      </div>

      <Footer />
      <BottomNav user={user} />
    </div>
  );
}
