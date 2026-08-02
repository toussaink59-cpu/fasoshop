"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCart, cartCount } from "@/lib/cart";
import BannerCarousel from "@/app/components/BannerCarousel";
import CategoryMegaMenu from "@/app/components/CategoryMegaMenu";
import WhyFasoShop from "@/app/components/WhyFasoShop";
import Footer from "@/app/components/Footer";
import FlashSaleSection from "@/app/components/FlashSaleSection";

export default function HomePage() {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [categories, setCategories] = useState([]);
  const [user, setUser] = useState(null);
  const [userChecked, setUserChecked] = useState(false);

  useEffect(() => {
    setCount(cartCount(getCart()));
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
          {userChecked && user && <Link href="/favoris"><button>♡ Favoris</button></Link>}
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
        <CategoryMegaMenu categories={categories} />
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

      <FlashSaleSection />

      <div className="home-section" style={{ textAlign: "center" }}>
        <Link href="/shop">
          <button className="btn btn-primary" style={{ fontSize: "1rem", padding: "14px 36px" }}>
            Voir tout le catalogue →
          </button>
        </Link>
      </div>

      <Footer />
    </div>
  );
}
