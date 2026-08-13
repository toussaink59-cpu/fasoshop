import Link from "next/link";
import Footer from "@/app/components/Footer";
import SiteHeader from "@/app/components/SiteHeader";
import BottomNav from "@/app/components/BottomNav";
import { getCurrentUser } from "@/lib/session";
import { getCategoriesTree } from "@/lib/queries/categories";

export default async function DevenirVendeurPage() {
  const [user, categories] = await Promise.all([getCurrentUser(), getCategoriesTree()]);

  const steps = [
    { title: "Créez votre compte", desc: "Renseignez le nom de votre boutique, vos coordonnées et votre pièce d'identité." },
    { title: "Vérification", desc: "Notre équipe vérifie vos informations sous peu de temps pour protéger tous les acheteurs." },
    { title: "Publiez vos produits", desc: "Ajoutez vos produits avec photos, prix et stock, en quelques minutes." },
    { title: "Vendez et soyez payé", desc: "Recevez vos commandes et votre part des ventes via Mobile Money, moins 9% de commission." },
  ];

  return (
    <div className="shell">
      <SiteHeader initialUser={user} categories={categories} />

      <div className="content">
        <div className="page-header">
          <h1>Vendez sur Kimoxa</h1>
          <p>Rejoignez les boutiques qui vendent déjà partout au Burkina Faso, sans frais d'inscription.</p>
        </div>

        <div className="trust-strip">
          <div className="trust-item"><span className="trust-icon">🏪</span> Boutiques vérifiées</div>
          <div className="trust-item"><span className="trust-icon">📱</span> Paiement Mobile Money</div>
          <div className="trust-item"><span className="trust-icon">📈</span> Tableau de bord de vente</div>
          <div className="trust-item"><span className="trust-icon">🤝</span> Commission unique de 9%</div>
        </div>

        <div className="panel">
          <h2>Comment ça marche</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, marginTop: 16 }}>
            {steps.map((s, i) => (
              <div key={i}>
                <div style={{ fontWeight: 700, color: "var(--gold-600)", marginBottom: 4 }}>
                  {i + 1}. {s.title}
                </div>
                <p style={{ color: "var(--ink-400)", margin: 0, fontSize: "0.9rem" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2>Une commission simple et transparente</h2>
          <p style={{ color: "var(--ink-400)", marginTop: -8, marginBottom: 16 }}>
            Pas de frais cachés, pas d'abonnement — vous ne payez que lorsque vous vendez.
          </p>
          <table>
            <thead>
              <tr>
                <th>Montant de la vente</th>
                <th>Commission Kimoxa (9%)</th>
                <th>Vous recevez</th>
              </tr>
            </thead>
            <tbody>
              {[5000, 20000, 100000].map((amount) => {
                const commission = Math.round(amount * 0.055);
                return (
                  <tr key={amount}>
                    <td>{amount.toLocaleString("fr-FR")} FCFA</td>
                    <td>{commission.toLocaleString("fr-FR")} FCFA</td>
                    <td style={{ fontWeight: 700, color: "var(--millet-600)" }}>
                      {(amount - commission).toLocaleString("fr-FR")} FCFA
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <h2>Vos avantages</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginTop: 16 }}>
            <div>
              <div style={{ fontSize: "1.6rem", marginBottom: 6 }}>👀</div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Visibilité</div>
              <p style={{ color: "var(--ink-400)", margin: 0, fontSize: "0.9rem" }}>
                Votre boutique apparaît dans le catalogue, les recherches et les recommandations vues par tous les acheteurs Kimoxa.
              </p>
            </div>
            <div>
              <div style={{ fontSize: "1.6rem", marginBottom: 6 }}>🔒</div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Paiement sécurisé</div>
              <p style={{ color: "var(--ink-400)", margin: 0, fontSize: "0.9rem" }}>
                Vos ventes sont suivies et reversées via Mobile Money, avec un historique clair de chaque transaction.
              </p>
            </div>
            <div>
              <div style={{ fontSize: "1.6rem", marginBottom: 6 }}>✅</div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Confiance vérifiée</div>
              <p style={{ color: "var(--ink-400)", margin: 0, fontSize: "0.9rem" }}>
                Le badge "boutique vérifiée" rassure vos acheteurs et vous distingue des profils non contrôlés.
              </p>
            </div>
            <div>
              <div style={{ fontSize: "1.6rem", marginBottom: 6 }}>📊</div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Suivi de vos ventes</div>
              <p style={{ color: "var(--ink-400)", margin: 0, fontSize: "0.9rem" }}>
                Un tableau de bord dédié : ventes du jour et du mois, commandes, stock, tout en un seul endroit.
              </p>
            </div>
          </div>
        </div>

        <div className="panel" style={{ textAlign: "center" }}>
          <h2>Prêt à vendre ?</h2>
          <p style={{ color: "var(--ink-400)" }}>
            L'inscription prend moins de 5 minutes. Munissez-vous de votre CNI, passeport ou permis de conduire.
          </p>
          <Link href="/register?role=vendor">
            <button className="btn btn-primary" style={{ fontSize: "1rem", padding: "12px 28px" }}>
              Créer ma boutique
            </button>
          </Link>
        </div>
      </div>

      <Footer />
      <BottomNav user={user} />
    </div>
  );
}
