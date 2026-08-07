import Footer from "@/app/components/Footer";
import SiteHeader from "@/app/components/SiteHeader";
import BottomNav from "@/app/components/BottomNav";
import { getCurrentUser } from "@/lib/session";
import { getCategoriesTree } from "@/lib/queries/categories";

const FAQS = [
  {
    q: "Comment payer ma commande ?",
    a: "Vous pouvez régler via Mobile Money (Orange Money, Moov Money) une fois cette option activée, ou selon les modalités proposées au paiement.",
  },
  {
    q: "Comment savoir si une boutique est fiable ?",
    a: "Toutes les boutiques actives sur Kimoxa ont été vérifiées manuellement par notre équipe à partir d'une pièce d'identité officielle avant validation.",
  },
  {
    q: "Combien de temps prend la livraison ?",
    a: "Le délai dépend du vendeur et de votre localisation. Il est généralement précisé sur la fiche produit ou communiqué après la commande.",
  },
  {
    q: "Comment devenir vendeur sur Kimoxa ?",
    a: "Rendez-vous sur la page 'Devenir vendeur', créez votre compte avec le nom de votre boutique et votre pièce d'identité, puis attendez la validation de notre équipe.",
  },
  {
    q: "Quels sont les frais pour un vendeur ?",
    a: "L'inscription est gratuite. Kimoxa prélève uniquement une commission de 5,5% sur chaque vente réalisée.",
  },
  {
    q: "Que faire si mon produit n'arrive pas ?",
    a: "Contactez d'abord le vendeur depuis votre page 'Mes commandes'. Si le problème persiste, notre support peut intervenir.",
  },
];

export default async function FAQPage() {
  const [user, categories] = await Promise.all([getCurrentUser(), getCategoriesTree()]);

  return (
    <div className="shell">
      <SiteHeader initialUser={user} categories={categories} />

      <div className="content" style={{ maxWidth: 720, margin: "0 auto" }}>
        <div className="page-header">
          <h1>Questions fréquentes</h1>
        </div>

        <div className="panel">
          {FAQS.map((item, i) => (
            <div key={i} style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{item.q}</div>
              <p style={{ color: "var(--ink-400)", margin: 0 }}>{item.a}</p>
            </div>
          ))}
        </div>
      </div>

      <Footer />
      <BottomNav user={user} />
    </div>
  );
}
