"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getCart, cartCount } from "@/lib/cart";
import BannerCarousel from "@/app/components/BannerCarousel";
import CategoryMegaMenu from "@/app/components/CategoryMegaMenu";
import WhyFasoShop from "@/app/components/WhyFasoShop";
import PriceDisplay, { hasDiscount, discountPercent } from "@/app/components/PriceDisplay";

export default function HomePage() {
  const [count, setCount] = useState(0);
  const [featured, setFeatured] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setCount(cartCount(getCart()));
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => {
        setFeatured((data.products || []).slice(0, 8));
        setLoading(false);
      });
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []));
  }, []);

  return (
    <div className="shell">
      <div className="topbar home-topbar">
        <Link href="/" className="brand" style={{ textDecoration: "none" }}>
          🛒 FasoShop
        </Link>

        <div className="search-bar">
          <input type="text" placeholder="Rechercher un produit, une boutique..." />
        </div>

        <div className="topbar-actions">
          <Link href="/login"><button>Compte</button></Link>
          <Link href="/cart"><button>Panier {count > 0 ? `(${count})` : ""}</button></Link>
        </div>
      </div>

      <div className="category-bar">
        <CategoryMegaMenu />
        <nav className="category-nav">
          {categories.map((c) => (
            <Link key={c.slug} href={`/shop?category=${c.slug}`} className="category-pill">
              <span className="category-emoji">{c.emoji}</span>
              {c.name}
            </Link>
          ))}
        </nav>
      </div>

      <div className="woven-strip" />

      <BannerCarousel />

      <div className="trust-strip">
        <div className="trust-item"><span className="trust-icon">📱</span> Paiement Mobile Money</div>
        <div className="trust-item"><span className="trust-icon">🏪</span> Boutiques vérifiées</div>
        <div className="trust-item"><span className="trust-icon">🚚</span> Livraison partout au pays</div>
        <div className="trust-item"><span className="trust-icon">↩️</span> Support client réactif</div>
      </div>

      <WhyFasoShop />

      <div className="home-section" style={{ marginTop: 40 }}>
        <div className="section-head">
          <h2>Catégories</h2>
        </div>
        <div className="category-grid">
          {categories.map((c) => (
            <Link key={c.slug} href={`/shop?category=${c.slug}`} className="category-tile">
              <span className="tile-emoji">{c.emoji}</span>
              <span className="tile-label">{c.name}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="home-section">
        <div className="section-head">
          <h2>Produits en vedette</h2>
          <Link href="/shop" className="view-all">Voir tout le catalogue →</Link>
        </div>

        {loading ? (
          <p>Chargement...</p>
        ) : featured.length === 0 ? (
          <div className="empty-state">
            <div className="glyph">🛍️</div>
            <p>Aucun produit disponible pour l'instant.</p>
          </div>
        ) : (
          <div className="product-grid">
            {featured.map((p) => (
              <Link href="/shop" key={p.id} className="product-card" style={{ textDecoration: "none" }}>
                {hasDiscount(p) && (
                  <span className="badge-discount">-{discountPercent(p)}%</span>
                )}
                <div className="name">{p.name}</div>
                <div className="shop">{p.shop_name}</div>
                <PriceDisplay product={p} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
