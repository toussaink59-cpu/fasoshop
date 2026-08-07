"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCart, cartCount } from "@/lib/cart";
import SideMenu from "@/app/components/SideMenu";
import SearchBar from "@/app/components/SearchBar";
import KimoxaLogo from "@/app/components/KimoxaLogo";

// Header style Temu : UNE rangée — logo | recherche compacte | icônes fines.
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
            <KimoxaLogo size={24} />
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

          {/* Icônes fines à droite, comme Temu */}
          <div className="site-header-actions">
            <button
              ref={hamburgerRef}
              className="site-header-icon-btn site-header-hamburger"
              onClick={() => setMenuOpen(true)}
              aria-label="Ouvrir le menu"
              aria-expanded={menuOpen}
              aria-haspopup="dialog"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="14" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            </button>

            <Link href={accountLink()} className="site-header-icon-btn site-header-account" aria-label="Compte">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
              </svg>
            </Link>

            <Link href="/cart" className="site-header-icon-btn" aria-label="Panier">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="9" cy="20" r="1.5" />
                <circle cx="17" cy="20" r="1.5" />
                <path d="M3 4h2l2.6 12h10.8L21 8H6" />
              </svg>
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
