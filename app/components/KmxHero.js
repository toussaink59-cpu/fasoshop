import Link from "next/link";

// Hero statique = maquette exacte (pas de carrousel, palette propre)
export default function KmxHero() {
  return (
    <section className="kmx-hero">
      <div className="kmx-hero-copy">
        <h1>
          Soutenons nos<br />
          <span>vendeurs locaux.</span>
        </h1>
        <p>
          Découvrez des produits sélectionnés auprès de commerçants
          du Burkina Faso et achetez en ligne avec une expérience simple,
          moderne et rassurante.
        </p>
        <Link className="kmx-primary" href="/shop">Découvrir</Link>
      </div>
      <div className="kmx-hero-visual">
        <img
          className="kmx-hero-image"
          src="/images/hero-vendeuse.jpg"
          alt="Commerçante KIMOXA souriante à son étal"
        />
      </div>
    </section>
  );
}
