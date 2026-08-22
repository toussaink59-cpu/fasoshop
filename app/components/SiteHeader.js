"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCart, cartCount } from "@/lib/cart";
import SideMenu from "@/app/components/SideMenu";
import SearchBar from "@/app/components/SearchBar";
import KimoxaLogo from "@/app/components/KimoxaLogo";
import { MenuIcon, UserIcon, ShoppingCartIcon } from "@/app/components/Icons";

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

          <Link href="/" className="site-header-logo" aria-label="Kimoxa — accueil">
            <KimoxaLogo size={24} />
          </Link>

          <div className="site-header-search-compact">
            <SearchBar initialValue={searchValue} />
          </div>

          <div className="site-header-desktop-actions">
            <Link href="/devenir-vendeur" className="btn-header-link">Devenir vendeur</Link>
            {user ? (
              <>
                <Link href={accountLink()} className="btn-header-link">
                  <UserIcon size={16} style={{ marginRight: 6 }} />
                  Bonjour, {user.full_name?.split(" ")[0]}
                </Link>
                <button className="btn-header-link" onClick={handleDesktopLogout}>Déconnexion</button>
              </>
            ) : (
              <Link href="/login" className="btn-header-link">
                <UserIcon size={16} style={{ marginRight: 6 }} />
                Compte
              </Link>
            )}
          </div>

          <div className="site-header-actions">
            <button
              className="site-header-icon-btn site-header-hamburger"
              onClick={() => setMenuOpen(true)}
              aria-label="Ouvrir le menu"
              aria-expanded={menuOpen}
              aria-haspopup="dialog"
              ref={hamburgerRef}
            >
              <MenuIcon size={22} />
            </button>

            <Link href={accountLink()} className="site-header-icon-btn site-header-account" aria-label="Compte">
              <UserIcon size={22} />
            </Link>

            <Link href="/cart" className="site-header-icon-btn" aria-label="Panier">
              <ShoppingCartIcon size={22} />
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
