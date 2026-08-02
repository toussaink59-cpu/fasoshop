"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCart, cartCount } from "@/lib/cart";
import SideMenu from "@/app/components/SideMenu";
import SearchBar from "@/app/components/SearchBar";

// Header sticky mobile-first : logo + icônes essentielles (favoris, messages,
// panier) + hamburger ouvrant le SideMenu (compte, catégories, liens légaux).
// La barre de recherche est un second bloc, sous la rangée d'icônes, pour que
// la rangée principale tienne dans 60-70px même sur les écrans les plus
// étroits (360px, Galaxy S23) sans débordement.
//
// À partir de 768px (tablette/desktop), les actions précédemment visibles en
// permanence (Devenir vendeur, Compte, Déconnexion) réapparaissent dans le
// header lui-même (.site-header-desktop-actions) : la demande portait sur la
// refonte MOBILE, on ne régresse donc pas l'expérience desktop existante.
export default function SiteHeader({ initialUser, categories = [], searchValue = "" }) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartCountValue, setCartCountValue] = useState(0);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const update = () => setCartCountValue(cartCount(getCart()));
    update();
    window.addEventListener("fasoshop-cart-updated", update);
    return () => window.removeEventListener("fasoshop-cart-updated", update);
  }, []);

  useEffect(() => {
    if (!user) return;
    fetch("/api/conversations/unread-count")
      .then((r) => (r.ok ? r.json() : { unread: 0 }))
      .then((d) => setUnread(d.unread || 0))
      .catch(() => {});
  }, [user]);

  function accountLink() {
    if (!user) return "/login";
    if (user.role === "vendor") return "/vendor/dashboard";
    if (user.role === "admin") return "/admin/dashboard";
    return "/orders";
  }

  async function handleDesktopLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
  }

  return (
    <>
      <header className="site-header">
        <div className="site-header-row">
          <button
            className="site-header-icon-btn site-header-hamburger"
            onClick={() => setMenuOpen(true)}
            aria-label="Ouvrir le menu"
          >
            ☰
          </button>

          <Link href="/" className="site-header-logo" aria-label="FasoShop — accueil">
            🛒 FasoShop
          </Link>

          <div className="site-header-desktop-actions">
            <Link href="/devenir-vendeur"><button className="btn-header-link">Devenir vendeur</button></Link>
            {user ? (
              <>
                <Link href={accountLink()}><button className="btn-header-link">Bonjour, {user.full_name?.split(" ")[0]}</button></Link>
                <button className="btn-header-link" onClick={handleDesktopLogout}>Déconnexion</button>
              </>
            ) : (
              <Link href="/login"><button className="btn-header-link">Compte</button></Link>
            )}
          </div>

          <div className="site-header-actions">
            <Link href="/favoris" className="site-header-icon-btn" aria-label="Favoris">
              ♡
            </Link>
            <Link href="/messages" className="site-header-icon-btn" aria-label="Messages">
              💬
              {unread > 0 && <span className="site-header-badge">{unread > 9 ? "9+" : unread}</span>}
            </Link>
            <Link href="/cart" className="site-header-icon-btn" aria-label="Panier">
              🛒
              {cartCountValue > 0 && (
                <span className="site-header-badge">{cartCountValue > 9 ? "9+" : cartCountValue}</span>
              )}
            </Link>
          </div>
        </div>

        <div className="site-header-search-row">
          <SearchBar initialValue={searchValue} />
        </div>
      </header>

      <SideMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        user={user}
        categories={categories}
        onLogout={() => setUser(null)}
      />
    </>
  );
}
