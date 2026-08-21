"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChartIcon, StoreIcon, ShieldCheckIcon, PackageIcon, PercentIcon } from "@/app/components/Icons";

export default function AdminBottomNav({ pendingShopsCount = 0, pendingModerationCount = 0 }) {
  const pathname = usePathname();

  const items = [
    { href: "/admin/dashboard", label: "Résumé", Icon: BarChartIcon, match: (p) => p === "/admin/dashboard" },
    { href: "/admin/shops", label: "Boutiques", Icon: StoreIcon, match: (p) => p.startsWith("/admin/shops"), badge: pendingShopsCount },
    { href: "/admin/moderation", label: "Modération", Icon: ShieldCheckIcon, match: (p) => p.startsWith("/admin/moderation"), badge: pendingModerationCount },
    { href: "/admin/products", label: "Produits", Icon: PackageIcon, match: (p) => p.startsWith("/admin/products") },
    { href: "/admin/analytics", label: "Analytics", Icon: PercentIcon, match: (p) => p.startsWith("/admin/analytics") },
  ];

  return (
    <nav className="bottom-nav" aria-label="Navigation admin">
      {items.map((item) => {
        const active = item.match(pathname);
        const { Icon } = item;
        return (
          <Link
            key={item.label}
            href={item.href}
            className={`bottom-nav-item ${active ? "is-active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <span className="bottom-nav-icon" style={{ position: "relative", display: "inline-flex" }}>
              <Icon size={22} />
              {item.badge > 0 && <span className="bottom-nav-badge">{item.badge > 9 ? "9+" : item.badge}</span>}
            </span>
            <span className="bottom-nav-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
