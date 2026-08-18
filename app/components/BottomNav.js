"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { getCart, cartCount } from "@/lib/cart";

export default function BottomNav({ user }) {
  const pathname = usePathname();
  const [count, setCount] = useState(0);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const update = () => setCount(cartCount(getCart()));
    update();
    window.addEventListener("fasoshop-cart-updated", update);
    return () => window.removeEventListener("fasoshop-cart-updated", update);
  }, []);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/conversations/unread-count");
        if (!res.ok) return;
        const data = await res.json();
        if (alive) setUnread(data.unread || 0);
      } catch {}
    };
    load();
    const t = setInterval(load, 30000);
    return () => { alive = false; clearInterval(t); };
  }, [user]);

  const accountHref = !user ? "/login" : user.role === "vendor" ? "/vendor/dashboard" : user.role === "admin" ? "/admin/dashboard" : "/orders";

  const items = [
    { href: "/", label: "Accueil", icon: "🏠", match: (p) => p === "/" },
    { href: "/shop", label: "Catégories", icon: "🗂️", match: (p) => p.startsWith("/shop") },
    { href: "/cart", label: "Panier", icon: "🛒", match: (p) => p.startsWith("/cart"), badge: count },
    { href: "/messages", label: "Messages", icon: "💬", match: (p) => p.startsWith("/messages"), badge: unread },
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
