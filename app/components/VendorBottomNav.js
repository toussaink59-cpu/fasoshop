"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Bottom Navigation spécifique au back-office vendeur — distincte de
// app/components/BottomNav.js (navigation acheteur : Accueil/Panier/
// Favoris...) qui n'a aucun sens ici. Un vendeur en train de gérer sa
// boutique a besoin de Produits / Commandes / Revenus / Compte.
export default function VendorBottomNav({ newOrdersCount = 0, unreadMessages = 0 }) {
  const pathname = usePathname();

  const items = [
    { href: "/vendor/dashboard", label: "Produits", icon: "📦", match: (p) => p.startsWith("/vendor/dashboard") },
    { href: "/vendor/orders", label: "Commandes", icon: "🧾", match: (p) => p.startsWith("/vendor/orders"), badge: newOrdersCount },
    { href: "/vendor/revenue", label: "Revenus", icon: "💰", match: (p) => p.startsWith("/vendor/revenue") },
    { href: "/vendor/account", label: "Compte", icon: "🏪", match: (p) => p.startsWith("/vendor/account") },
  ];

  return (
    <nav className="bottom-nav" aria-label="Navigation vendeur">
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
