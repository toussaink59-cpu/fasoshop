"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCart, cartCount } from "@/lib/cart";
import BannerCarousel from "@/app/components/BannerCarousel";
import CategoryMegaMenu from "@/app/components/CategoryMegaMenu";
import WhyFasoShop from "@/app/components/WhyFasoShop";
import Footer from "@/app/components/Footer";
import PriceDisplay, { hasDiscount, discountPercent } from "@/app/components/PriceDisplay";
import FlashSaleSection from "@/app/components/FlashSaleSection";

const CONDITION_LABELS = { neuf: "Neuf", quasi_neuf: "Quasi neuf", occasion: "Occasion" };
const CONDITION_COLORS = { neuf: "var(--gold-600)", quasi_neuf: "#6b7280", occasion: "var(--bissap-600)" };

function ProductCard({ p }) {
  return (
    <Link href={`/shop/${p.id}`} className="product-card" style={{ textDecoration: "none" }}>
      {hasDiscount(p) && <span className="badge-discount">-{discountPercent(p)}%</span>}
      {p.images && p.images.length > 0 ? (
        <img
          src={p.images[0]}
          alt={p.name}
          style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", borderRadius: 6, marginBottom: 8 }}
        />
      ) : (
        <div style={{ width: "100%", aspectRatio: "1 / 1", background: "var(--sand-100)", borderRadius: 6, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>
          🛍️
        </div>
      )}
      <div className="name">{p.name}</div>
      <span
        style={{
          fontSize: "0.7rem",
          fontWeight: 700,
          color: "white",
          background: CONDITION_COLORS[p.condition] || "var(--gold-600)",
          borderRadius: 999,
          padding: "2px 8px",
          display: "inline-block",
          marginTop: 4,
        }}
      >
        {CONDITION_LABELS[p.condition] || "Neuf"}
      </span>
      <div className="shop">
        {p.shop_name}
        {Number(p.shop_review_count) > 0 && (
          <span style={{ color: "var(--gold-600)", marginLeft: 6 }}>⭐ {p.shop_rating}</span>
        )}
      </div>
      <PriceDisplay product={p} />
    </Link>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [bestSellers, setBestSellers] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userChecked, setUserChecked] = useState(false);

  useEffect(() => {
    setCount(cartCount(getCart()));
    fetch("/api/products/homepage")
      .then((r) => r.json())
      .then((data) => {
        setBestSellers(data.bestSellers || []);
        setNewArrivals(data.newArrivals || []);
        setLoading(false);
      });
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []));
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setUser(d.user || null);
        setUserChecked(true);
      });
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
  }

  function accountLink() {
    if (!user) return "/login";
    if (user.role === "vendor") return "/vendor/dashboard";
    if (user.role === "admin") return "/admin/dashboard";
    return "/orders";
  }

  return (
    <div className="shell">
      <div className="topbar home-topbar">
        <Link href="/" className="brand" style={{ textDecoration: "none" }}>
          🛒 FasoShop
        </Link>

        <form
          className="search-bar"
          onSubmit={(e) => {
            e.preventDefault();
            const q = e.target.elements.q.value;
            router.push(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop");
          }}
        >
          <input type="text" name="q" placeholder="Rechercher un produit, une boutique..." />
        </form>

        <div className="topbar-actions">
          <Link href="/devenir-vendeur"><button>Devenir vendeur</button></Link>
          {userChecked && user ? (
            <>
              <Link href={accountLink()}><button>Bonjour, {user.full_name?.split(" ")[0]}</button></Link>
              <button onClick={handleLogout}>Déconnexion</button>
            </>
          ) : (
            <Link href="/login"><button>Compte</button></Link>
          )}
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

      <FlashSaleSection />

      <WhyFasoShop />

      <div className="home-section">
        <div className="section-head">
          <h2>🔥 Meilleures ventes</h2>
          <Link href="/shop" className="view-all">Voir tout le catalogue →</Link>
        </div>

        {loading ? (
          <p>Chargement...</p>
        ) : bestSellers.length === 0 ? (
          <div className="empty-state">
            <div className="glyph">🛍️</div>
            <p>Aucun produit disponible pour l'instant.</p>
          </div>
        ) : (
          <div className="product-grid">
            {bestSellers.map((p) => <ProductCard p={p} key={p.id} />)}
          </div>
        )}
      </div>

      <div className="home-section">
        <div className="section-head">
          <h2>🆕 Nouveautés</h2>
          <Link href="/shop" className="view-all">Voir tout le catalogue →</Link>
        </div>

        {loading ? (
          <p>Chargement...</p>
        ) : newArrivals.length === 0 ? (
          <div className="empty-state">
            <div className="glyph">🛍️</div>
            <p>Aucun produit disponible pour l'instant.</p>
          </div>
        ) : (
          <div className="product-grid">
            {newArrivals.map((p) => <ProductCard p={p} key={p.id} />)}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
