"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { getCart, cartCount } from "@/lib/cart";

// Bottom Navigation fixe, mobile uniquement (masquée en desktop via CSS).
// L'onglet actif est déduit du chemin courant.
export default function BottomNav({ user }) {
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const update = () => setCount(cartCount(getCart()));
    update();
    window.addEventListener("fasoshop-cart-updated", update);
    return () => window.removeEventListener("fasoshop-cart-updated", update);
  }, []);

  const accountHref = !user ? "/login" : user.role === "vendor" ? "/vendor/dashboard" : user.role === "admin" ? "/admin/dashboard" : "/orders";

  const items = [
    { href: "/", label: "Accueil", icon: "🏠", match: (p) => p === "/" },
    { href: "/shop", label: "Catégories", icon: "🗂️", match: (p) => p.startsWith("/shop") },
    { href: "/cart", label: "Panier", icon: "🛒", match: (p) => p.startsWith("/cart"), badge: count },
    { href: "/favoris", label: "Favoris", icon: "♡", match: (p) => p.startsWith("/favoris") },
    { href: accountHref, label: "Compte", icon: "👤", match: (p) => ["/login", "/orders", "/vendor/dashboard", "/admin/dashboard"].some((h) => p.startsWith(h)) },
  ];

  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      {items.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.label}
            href={item.href}
            className={`bottom-nav-item ${active ? "is-active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <span className="bottom-nav-icon">
              {item.icon}
              {item.badge > 0 && <span className="bottom-nav-badge">{item.badge > 9 ? "9+" : item.badge}</span>}
            </span>
            <span className="bottom-nav-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
