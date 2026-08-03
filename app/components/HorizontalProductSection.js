import Link from "next/link";
import ProductCard from "@/app/components/ProductCard";

// Section homepage générique : titre + lien "Voir tout" + défilement
// horizontal de ProductCard. Utilisée pour Nouveautés / Meilleures ventes /
// Populaires — toutes alimentées par de vraies requêtes SQL (voir
// lib/queries/homepage.js et lib/queries/products.js), aucune donnée simulée.
// Ne rend rien si la liste est vide (ex: aucune vente encore enregistrée
// pour "Meilleures ventes") plutôt que d'afficher une section vide.
export default function HorizontalProductSection({ title, icon, seeAllHref, products, user }) {
  if (!products || products.length === 0) return null;

  return (
    <div className="home-section home-hscroll-section">
      <div className="section-head">
        <h2>{icon} {title}</h2>
        {seeAllHref && (
          <Link href={seeAllHref} className="section-see-all">Voir tout →</Link>
        )}
      </div>
      <div className="home-hscroll-track">
        {products.map((p) => (
          <div className="home-hscroll-item" key={p.id}>
            <ProductCard p={p} user={user} compact />
          </div>
        ))}
      </div>
    </div>
  );
}
