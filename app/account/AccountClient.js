"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SiteHeader from "@/app/components/SiteHeader";
import BottomNav from "@/app/components/BottomNav";

export default function AccountClient({ initialUser, categories }) {
  const [counts, setCounts] = useState({});

  // Compteurs en direct (commandes, favoris, adresses, messages)
  useEffect(() => {
    async function countFrom(url, keys) {
      try {
        const r = await fetch(url);
        if (!r.ok) return null;
        const d = await r.json();
        const arr = Array.isArray(d)
          ? d
          : keys.map((k) => d?.[k]).find(Array.isArray) || null;
        return arr ? arr.length : null;
      } catch {
        return null;
      }
    }
    Promise.all([
      countFrom("/api/orders", ["orders", "items"]),
      countFrom("/api/favorites", ["favorites"]),
      countFrom("/api/addresses", ["addresses"]),
      countFrom("/api/conversations", ["conversations"]),
    ]).then(([orders, favorites, addresses, messages]) =>
      setCounts({ orders, favorites, addresses, messages })
    );
  }, []);

  const fullName = initialUser?.full_name || initialUser?.name || "cher client";
  const initials = fullName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const sections = [
    { href: "/orders", icon: "📦", title: "Mes commandes", desc: "Suivre mes achats et livraisons", count: counts.orders },
    { href: "/favoris", icon: "❤️", title: "Mes favoris", desc: "Ma liste d'envies", count: counts.favorites },
    { href: "/account/addresses", icon: "📍", title: "Mes adresses", desc: "Gérer mes adresses de livraison", count: counts.addresses },
    { href: "/messages", icon: "💬", title: "Messages", desc: "Discuter avec les vendeurs", count: counts.messages },
    { href: "/cart", icon: "🛒", title: "Mon panier", desc: "Reprendre mon panier" },
    initialUser?.role === "vendor"
      ? { href: "/vendor/dashboard", icon: "🏪", title: "Ma boutique", desc: "Gérer mes produits et mon stock" }
      : { href: "/devenir-vendeur", icon: "🏪", title: "Devenir vendeur", desc: "Ouvrir ma boutique sur FasoShop" },
  ];

  return (
    <div className="shell">
      <SiteHeader initialUser={initialUser} categories={categories} />

      <div className="account-wrap">
        {/* Bannière profil */}
        <div className="account-banner">
          <div className="account-avatar">{initials}</div>
          <div className="account-id">
            <h1>Bonjour, {fullName} 👋</h1>
            <p>{initialUser?.email}</p>
          </div>
          <span className="account-role">
            {initialUser?.role === "vendor" ? "Vendeur" : "Acheteur"}
          </span>
        </div>

        {/* Grille des sections */}
        <div className="account-grid">
          {sections.map((s) => (
            <Link key={s.title} href={s.href} className="account-card">
              <span className="account-card-icon">{s.icon}</span>
              <div className="account-card-text">
                <strong>{s.title}</strong>
                <span>{s.desc}</span>
              </div>
              {typeof s.count === "number" && s.count > 0 && (
                <span className="account-count">{s.count}</span>
              )}
              <span className="account-arrow">›</span>
            </Link>
          ))}
        </div>
      </div>

      <BottomNav user={initialUser} />
    </div>
  );
}
