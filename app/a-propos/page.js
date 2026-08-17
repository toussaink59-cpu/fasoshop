import { getCurrentUser } from "@/lib/session";
import { getCategoriesTree } from "@/lib/queries/categories";
import SiteHeader from "@/app/components/SiteHeader";
import Footer from "@/app/components/Footer";
import BottomNav from "@/app/components/BottomNav";

export const metadata = {
  title: "À propos de Kimoxa",
};

export default async function AboutPage() {
  const [user, categories] = await Promise.all([
    getCurrentUser(),
    getCategoriesTree(),
  ]);

  return (
    <div className="shell">
      <SiteHeader initialUser={user} categories={categories} />

      <div className="content" style={{ maxWidth: 760, margin: "0 auto" }}>
        <div className="page-header" style={{ textAlign: "center" }}>
          <h1>À propos de Kimoxa</h1>
          <p>Né en Afrique, pensé pour l’Afrique.</p>
        </div>

        <div className="panel">
          <h2>Notre rôle</h2>
          <p>
            Kimoxa est une <strong>marketplace multi-vendeurs</strong> : nous mettons en relation
            des vendeurs et des acheteurs et leur fournissons l'infrastructure nécessaire pour
            découvrir des produits, passer commande, payer et suivre les transactions.
          </p>
          <p>
            Kimoxa n'est pas une boutique unique et ne se présente pas comme le propriétaire des
            produits proposés par les vendeurs. Chaque vendeur reste responsable de ses produits,
            de ses prix, de ses stocks, de ses annonces et de l'exécution de ses ventes.
          </p>

          <h2>Pourquoi Kimoxa ?</h2>
          <p>
            Nous construisons une expérience de commerce en ligne adaptée aux réalités africaines :
            boutiques locales, paiement mobile, livraison, accompagnement et mécanismes de confiance.
            Notre objectif est de rendre la découverte et l'achat en ligne plus simples tout en
            donnant aux commerçants un espace structuré pour développer leur activité.
          </p>

          <h2>La confiance au cœur du modèle</h2>
          <p>
            Les vendeurs qui souhaitent commercialiser leurs produits passent par un processus de
            vérification avant l'activation de leur activité de vente. Kimoxa peut également
            suspendre une boutique ou une annonce lorsqu'un risque, une fraude ou un non-respect
            des règles de la plateforme est identifié.
          </p>
          <p>
            Côté catalogue public, les produits doivent respecter les règles de publication de la
            plateforme et les produits en rupture de stock ne sont pas proposés comme disponibles
            à l'achat.
          </p>

          <h2>Un modèle aligné avec les vendeurs</h2>
          <p>
            L'inscription vendeur est gratuite. Kimoxa se rémunère notamment par une commission
            appliquée aux ventes réalisées sur la plateforme, selon les conditions communiquées au
            vendeur. Les montants de vente, commissions et revenus sont suivis dans l'espace vendeur.
          </p>

          <h2>Notre ambition</h2>
          <p>
            Kimoxa commence avec une implantation au Burkina Faso et porte une ambition plus large :
            construire progressivement une infrastructure de commerce numérique capable de servir
            plusieurs marchés africains, avec des moyens de paiement, des contraintes logistiques
            et des réalités locales adaptés à chaque pays.
          </p>
          <p>
            <strong>Né en Afrique, pensé pour l’Afrique.</strong> Notre ambition est de grandir avec
            les commerçants, les entrepreneurs et les acheteurs qui feront vivre cette plateforme.
          </p>
        </div>
      </div>

      <Footer />
      <BottomNav user={user} />
    </div>
  );
}
