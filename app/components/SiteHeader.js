"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCart, cartCount } from "@/lib/cart";
import SideMenu from "@/app/components/SideMenu";
import SearchBar from "@/app/components/SearchBar";
import KimoxaLogo from "@/app/components/KimoxaLogo";

// Header style Temu : UNE seule rangée — logo | recherche compacte | icônes.
export default function SiteHeader({ initialUser, categories = [], searchValue = "" }) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartCountValue, setCartCountValue] = useState(0);
  const hamburgerRef = useRef(null);

  function closeMenu() {
    setMenuOpen(false);
    hamburgerRef.current?.focus();
  }

  useEffect(() => {
    const update = () => setCartCountValue(cartCount(getCart()));
    update();
    window.addEventListener("fasoshop-cart-updated", update);
    return () => window.removeEventListener("fasoshop-cart-updated", update);
  }, []);

  function accountLink() {
    if (!user) return "/login";
    if (user.role === "vendor") return "/vendor/dashboard";
    if (user.role === "admin") return "/admin/dashboard";
    return "/account";
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

          {/* Logo à gauche */}
          <Link href="/" className="site-header-logo" aria-label="Kimoxa — accueil">
            <KimoxaLogo size={26} />
          </Link>

          {/* Recherche compacte au centre */}
          <div className="site-header-search-compact">
            <SearchBar initialValue={searchValue} />
          </div>

          {/* Actions desktop (PC uniquement) */}
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

          {/* 3 icônes à droite, comme Temu */}
          <div className="site-header-actions">
            <button
              ref={hamburgerRef}
              className="site-header-icon-btn site-header-hamburger"
              onClick={() => setMenuOpen(true)}
              aria-label="Ouvrir le menu"
              aria-expanded={menuOpen}
              aria-haspopup="dialog"
            >
              ☰
            </button>
            <Link href={accountLink()} className="site-header-icon-btn site-header-account" aria-label="Compte">
              👤
            </Link>
            <Link href="/cart" className="site-header-icon-btn" aria-label="Panier">
              🛒
              {cartCountValue > 0 && (
                <span className="site-header-badge">{cartCountValue > 9 ? "9+" : cartCountValue}</span>
              )}
            </Link>
          </div>
        </div>
      </header>

      <SideMenu
        open={menuOpen}
        onClose={closeMenu}
        user={user}
        categories={categories}
        onLogout={() => setUser(null)}
      />
    </>
  );
}
