"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PackageIcon, ShoppingCartIcon, WalletIcon, StoreIcon } from "@/app/components/Icons";

export default function VendorBottomNav({ newOrdersCount = 0, unreadMessages = 0 }) {
  const pathname = usePathname();

  const items = [
    { href: "/vendor/dashboard", label: "Produits", Icon: PackageIcon, match: (p) => p.startsWith("/vendor/dashboard") },
    { href: "/vendor/orders", label: "Commandes", Icon: ShoppingCartIcon, match: (p) => p.startsWith("/vendor/orders"), badge: newOrdersCount },
    { href: "/vendor/revenue", label: "Revenus", Icon: WalletIcon, match: (p) => p.startsWith("/vendor/revenue") },
    { href: "/vendor/account", label: "Compte", Icon: StoreIcon, match: (p) => p.startsWith("/vendor/account") },
  ];

  return (
    <nav className="bottom-nav" aria-label="Navigation vendeur">
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
