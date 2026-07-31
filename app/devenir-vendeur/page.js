import Link from "next/link";
import Footer from "@/app/components/Footer";

export default function DevenirVendeurPage() {
  const steps = [
    { title: "Créez votre compte", desc: "Renseignez le nom de votre boutique, vos coordonnées et votre pièce d'identité." },
    { title: "Vérification", desc: "Notre équipe vérifie vos informations sous peu de temps pour protéger tous les acheteurs." },
    { title: "Publiez vos produits", desc: "Ajoutez vos produits avec photos, prix et stock, en quelques minutes." },
    { title: "Vendez et soyez payé", desc: "Recevez vos commandes et votre part des ventes via Mobile Money, moins 5,5% de commission." },
  ];

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/" className="brand" style={{ textDecoration: "none" }}>🛒 FasoShop</Link>
        <div className="topbar-actions">
          <Link href="/login"><button>Se connecter</button></Link>
        </div>
      </div>
      <div className="woven-strip" />

      <div className="content">
        <div className="page-header">
          <h1>Vendez sur FasoShop</h1>
          <p>Rejoignez les boutiques qui vendent déjà partout au Burkina Faso, sans frais d'inscription.</p>
        </div>

        <div className="trust-strip">
          <div className="trust-item"><span className="trust-icon">🏪</span> Boutiques vérifiées</div>
          <div className="trust-item"><span className="trust-icon">📱</span> Paiement Mobile Money</div>
          <div className="trust-item"><span className="trust-icon">📈</span> Tableau de bord de vente</div>
          <div className="trust-item"><span className="trust-icon">🤝</span> Commission unique de 5,5%</div>
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
    </div>
  );
}
