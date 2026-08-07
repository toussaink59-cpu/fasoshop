"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

// Drawer latÃ©ral ouvert depuis le bouton hamburger du SiteHeader.
// Regroupe tout ce qui Ã©tait auparavant affichÃ© en permanence dans le
// header desktop (Bonjour X, DÃ©connexion, Devenir vendeur) + navigation
// et liens lÃ©gaux, pour libÃ©rer le header mobile.
export default function SideMenu({ open, onClose, user, categories = [], onLogout }) {
  const router = useRouter();
  const navRef = useRef(null);
  const closeBtnRef = useRef(null);

  // Ferme au clavier (Ã‰chap) â€” accessibilitÃ©.
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // PiÃ¨ge de focus clavier : tant que le menu est ouvert, Tab/Shift+Tab
  // reste Ã  l'intÃ©rieur du drawer (norme WAI-ARIA pour les dialogues
  // modaux). Sans Ã§a, un utilisateur au clavier peut tabuler vers des
  // liens invisibles hors Ã©cran derriÃ¨re l'overlay.
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

  // DÃ©place le focus dans le drawer Ã  l'ouverture (bouton fermer), et le
  // rend inerte (non focusable, non lisible par lecteur d'Ã©cran) une fois
  // refermÃ© â€” la transposition CSS seule (translateX) ne suffit pas, les
  // liens restaient tabulables hors Ã©cran.
  useEffect(() => {
    if (open) {
      closeBtnRef.current?.focus();
    }
  }, [open]);

  // EmpÃªche le scroll de l'arriÃ¨re-plan pendant que le drawer est ouvert.
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
    return "/orders";
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
                <Link href="/login" onClick={onClose}><button className="btn btn-primary">Se connecter</button></Link>
                <Link href="/register" onClick={onClose}><button className="btn btn-outline">CrÃ©er un compte</button></Link>
              </div>
            </div>
          )}
          <button ref={closeBtnRef} className="side-menu-close" onClick={onClose} aria-label="Fermer le menu">âœ•</button>
        </div>

        <div className="side-menu-body">
          {user && (
            <Link href={accountLink()} className="side-menu-link" onClick={onClose}>
              {user.role === "vendor" ? "ðŸ“Š Tableau de bord vendeur" : user.role === "admin" ? "ðŸ“Š Tableau de bord admin" : "ðŸ“¦ Mes commandes"}
            </Link>
          )}
          {user && user.role === "buyer" && (
            <Link href="/favoris" className="side-menu-link" onClick={onClose}>â™¡ Mes favoris</Link>
          )}
          {user && (
            <Link href="/messages" className="side-menu-link" onClick={onClose}>ðŸ’¬ Messages</Link>
          )}
          {user && (
            <Link href="/account/addresses" className="side-menu-link" onClick={onClose}>ðŸ“ Mes adresses</Link>
          )}

          <div className="side-menu-divider" />

          <p className="side-menu-section-title">CatÃ©gories</p>
          {categories.map((c) => (
            <Link key={c.slug} href={`/shop?category=${c.slug}`} className="side-menu-link" onClick={onClose}>
              {c.emoji} {c.name}
            </Link>
          ))}

          <div className="side-menu-divider" />

          {(!user || user.role === "buyer") && (
            <Link href="/devenir-vendeur" className="side-menu-link side-menu-link-accent" onClick={onClose}>
              ðŸª Devenir vendeur
            </Link>
          )}
          <Link href="/nos-vendeurs" className="side-menu-link" onClick={onClose}>Nos vendeurs</Link>
          <Link href="/a-propos" className="side-menu-link" onClick={onClose}>Ã€ propos</Link>
          <Link href="/faq" className="side-menu-link" onClick={onClose}>FAQ</Link>
          <Link href="/retours" className="side-menu-link" onClick={onClose}>Politique de retour</Link>

          <div className="side-menu-divider" />

          <Link href="/cgu" className="side-menu-link side-menu-link-small" onClick={onClose}>CGU</Link>
          <Link href="/cgv" className="side-menu-link side-menu-link-small" onClick={onClose}>CGV</Link>

          {user && (
            <>
              <div className="side-menu-divider" />
              <button className="side-menu-link side-menu-logout" onClick={handleLogout}>
                â» DÃ©connexion
              </button>
            </>
          )}
        </div>
      </nav>
    </>
  );
}
