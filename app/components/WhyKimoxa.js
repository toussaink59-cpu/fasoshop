import Image from "next/image";
import Link from "next/link";

const REASONS = [
  {
    image: "/images/lifestyle-famille-canape.jpg",
    title: "Pensé pour la famille",
    text: "Des milliers de produits pour toute la maison, à portée de clic.",
  },
  {
    image: "/images/lifestyle-shopping-femme.jpg",
    title: "Simple à utiliser",
    text: "Parcourez, ajoutez au panier, payez à la livraison — sans compliqué.",
  },
  {
    image: "/images/lifestyle-famille-supermarche.jpg",
    title: "Vos courses, sans le déplacement",
    text: "Plus besoin de faire la queue : on livre directement chez vous.",
  },
];

export default function WhyKimoxa() {
  return (
    <div className="why-section">
      <div className="section-head" style={{ maxWidth: 1080, margin: "0 auto 18px", padding: "0 28px" }}>
        <h2>Pourquoi Kimoxa</h2>
      </div>
      <div className="why-grid">
        {REASONS.map((r) => (
          <Link href="/shop" className="why-card" key={r.title} style={{ textDecoration: "none", color: "inherit" }}>
            <div className="why-card-image-wrap">
              <Image
                src={r.image}
                alt={r.title}
                fill
                sizes="(max-width: 640px) 100vw, 33vw"
                className="why-card-image"
              />
            </div>
            <div className="why-card-body">
              <h3>{r.title}</h3>
              <p>{r.text}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
