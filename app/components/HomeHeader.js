"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCart, cartCount } from "@/lib/cart";
import CategoryMegaMenu from "@/app/components/CategoryMegaMenu";

// Header de la page d'accueil : reçoit l'utilisateur et les catégories déjà
// résolus côté serveur (pas de flash "Se connecter" -> "Bonjour X", pas de
// requête réseau supplémentaire au chargement). Seul le compteur du panier
// (localStorage, propre au navigateur) est calculé côté client.
export default function HomeHeader({ initialUser, categories }) {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [user, setUser] = useState(initialUser);

  useEffect(() => {
    const updateCount = () => setCount(cartCount(getCart()));
    updateCount();
    window.addEventListener("fasoshop-cart-updated", updateCount);
    return () => window.removeEventListener("fasoshop-cart-updated", updateCount);
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
    <>
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
          {user && <Link href="/favoris"><button>♡ Favoris</button></Link>}
          {user ? (
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
    </>
  );
}
