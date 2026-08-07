"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

// Drawer latéral ouvert depuis le bouton hamburger du SiteHeader.
// Regroupe tout ce qui était auparavant affiché en permanence dans le
// header desktop (Bonjour X, Déconnexion, Devenir vendeur) + navigation
// et liens légaux, pour libérer le header mobile.

export default function SideMenu({ open, onClose, user, categories = [], onLogout }) {
  const router = useRouter();
  const navRef = useRef(null);
  const closeBtnRef = useRef(null);

  // Ferme au clavier (Échap) — accessibilité.
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Piège de focus clavier : tant que le menu est ouvert, Tab/Shift+Tab
  // reste à l'intérieur du drawer (norme WAI-ARIA pour les dialogues modaux).
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e) {
      if (e.key !== "Tab" || !navRef.current) return;

      const focusable = navRef.current.querySelectorAll(
        'a[href], button:not([disabled])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Déplace le focus dans le drawer à l'ouverture.
  useEffect(() => {
    if (open) {
      closeBtnRef.current?.focus();
    }
  }, [open]);

  // Empêche le scroll de l'arrière-plan pendant que le drawer est ouvert.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    onLogout?.();
    onClose();
    router.push("/");
    router.refresh();
  }

  function accountLink() {
    if (!user) return "/login";
    if (user.role === "vendor") return "/vendor/dashboard";
    if (user.role === "admin") return "/admin/dashboard";
    return "/account";
  }

  return (
    <>
      <div
        className={`side-menu-overlay ${open ? "is-open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <nav
        ref={navRef}
        className={`side-menu ${open ? "is-open" : ""}`}
        aria-label="Menu principal"
        aria-hidden={!open}
        aria-modal={open ? "true" : undefined}
        role={open ? "dialog" : undefined}
        inert={!open}
      >
        <div className="side-menu-header">
          {user ? (
            <>
              <div className="side-menu-avatar" aria-hidden="true">
                {user.full_name?.[0]?.toUpperCase() || "?"}
              </div>
              <div>
                <p className="side-menu-username">{user.full_name}</p>
                <p className="side-menu-usermail">{user.email}</p>
              </div>
            </>
          ) : (
            <div className="side-menu-guest">
              <p>Bienvenue sur FasoShop</p>
              <div className="side-menu-guest-actions">
                <Link href="/login" onClick={onClose}>
                  <button className="btn btn-primary">Se connecter</button>
                </Link>
                <Link href="/register" onClick={onClose}>
                  <button className="btn btn-outline">Créer un compte</button>
                </Link>
              </div>
            </div>
          )}
          <button
            ref={closeBtnRef}
            className="side-menu-close"
            onClick={onClose}
            aria-label="Fermer le menu"
          >
            ✕
          </button>
        </div>

        <div className="side-menu-body">
          {user && (
            <Link
              href={accountLink()}
              className="side-menu-link"
              onClick={onClose}
            >
              {user.role === "vendor"
                ? "📊 Tableau de bord vendeur"
                : user.role === "admin"
                ? "🛡️ Tableau de bord admin"
                : "👤 Mon compte"}
            </Link>
          )}

          {user && user.role === "buyer" && (
            <Link href="/orders" className="side-menu-link" onClick={onClose}>
              📦 Mes commandes
            </Link>
          )}

          {user && user.role === "buyer" && (
            <Link href="/favoris" className="side-menu-link" onClick={onClose}>
              ❤️ Mes favoris
            </Link>
          )}

          {user && (
            <Link href="/messages" className="side-menu-link" onClick={onClose}>
              💬 Messages
            </Link>
          )}

          {user && (
            <Link href="/account/addresses" className="side-menu-link" onClick={onClose}>
              📍 Mes adresses
            </Link>
          )}

          <div className="side-menu-divider" />

          <p className="side-menu-section-title">Catégories</p>
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/shop?category=${c.slug}`}
              className="side-menu-link"
              onClick={onClose}
            >
              {c.emoji} {c.name}
            </Link>
          ))}

          <div className="side-menu-divider" />

          {(!user || user.role === "buyer") && (
            <Link
              href="/devenir-vendeur"
              className="side-menu-link side-menu-link-accent"
              onClick={onClose}
            >
              🏪 Devenir vendeur
            </Link>
          )}

          <Link href="/nos-vendeurs" className="side-menu-link" onClick={onClose}>
            Nos vendeurs
          </Link>

          <Link href="/a-propos" className="side-menu-link" onClick={onClose}>
            À propos
          </Link>

          <Link href="/faq" className="side-menu-link" onClick={onClose}>
            FAQ
          </Link>

          <Link href="/retours" className="side-menu-link" onClick={onClose}>
            Politique de retour
          </Link>

          <div className="side-menu-divider" />

          <Link href="/cgu" className="side-menu-link side-menu-link-small" onClick={onClose}>
            CGU
          </Link>

          <Link href="/cgv" className="side-menu-link side-menu-link-small" onClick={onClose}>
            CGV
          </Link>

          {user && (
            <>
              <div className="side-menu-divider" />
              <button
                className="side-menu-link side-menu-logout"
                onClick={handleLogout}
              >
                🔒 Déconnexion
              </button>
            </>
          )}
        </div>
      </nav>
    </>
  );
}
