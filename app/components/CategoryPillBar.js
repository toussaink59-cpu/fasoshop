import { HeartIcon } from "@/app/components/Icons";
import Link from "next/link";

// Server Component : simple navigation, pas besoin de "use client"
export default function CategoryPillBar({ categories = [] }) {
  return (
    <nav className="pill-bar" aria-label="Catégories principales">
      <div className="pill-bar-head">
        <span className="pill-bar-tag"><HeartIcon size={14} style={{ color: "var(--gold-500)" }} /> Essentiels Kimoxa <HeartIcon size={14} style={{ color: "var(--gold-500)" }} /> </span>
        <h2 className="pill-bar-title">Explorez vos centres d'intérêt</h2>
      </div>
      <div className="pill-bar-track">
        <Link href="/shop" className="pill is-active">Recommandé</Link>
        {categories.map((c) => (
          <Link key={c.id} href={`/shop?category=${c.slug}`} className="pill">
            {c.name}
          </Link>
        ))}
      </div>
    </nav>
  );
}
