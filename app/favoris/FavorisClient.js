"use client";

import EmptyState from "@/app/components/EmptyState";
import { HeartIcon, ShoppingBagIcon } from "@/app/components/Icons";


import { useState } from "react";
import Link from "next/link";
import Footer from "@/app/components/Footer";
import SiteHeader from "@/app/components/SiteHeader";
import BottomNav from "@/app/components/BottomNav";
import PriceDisplay, { hasDiscount, discountPercent } from "@/app/components/PriceDisplay";

const CONDITION_LABELS = { neuf: "Neuf", quasi_neuf: "Quasi neuf", occasion: "Occasion" };

export default function FavorisClient({ initialUser, categories, initialProducts }) {
  const [products, setProducts] = useState(initialProducts);

  async function handleRemove(productId) {
    await fetch(`/api/favorites/${productId}`, { method: "DELETE" });
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  }

  return (
    <div className="shell">
      <SiteHeader initialUser={initialUser} categories={categories} />

      <div className="content">
        <div className="page-header">
          <h1>Mes favoris</h1>
        </div>

        {products.length === 0 ? (
          <div className="empty-state">
            <div className="glyph"><HeartIcon size={48} style={{ color: "var(--ink-300)" }} /></div>
            <p>Aucun favori pour l'instant.</p>
            <Link href="/shop"><button className="btn btn-primary" style={{ marginTop: 10 }}>Parcourir le catalogue</button></Link>
          </div>
        ) : (
          <div className="product-grid">
            {products.map((p) => (
              <div className="product-card" key={p.id}>
                {hasDiscount(p) && <span className="badge-discount">-{discountPercent(p)}%</span>}
                <Link href={`/shop/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  {p.images && p.images.length > 0 ? (
                    <img
                      src={p.images[0]}
                      alt={p.name}
                      style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", borderRadius: 6, marginBottom: 8 }}
                    />
                  ) : (
                    <div style={{ width: "100%", aspectRatio: "1 / 1", background: "var(--sand-100)", borderRadius: 6, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>
                      
                    </div>
                  )}
                  <div className="name">{p.name}</div>
                </Link>
                <div className="shop">{p.shop_name} · {CONDITION_LABELS[p.condition] || "Neuf"}</div>
                <PriceDisplay product={p} />
                <button className="btn btn-ghost" onClick={() => handleRemove(p.id)}>
                  Retirer des favoris
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
      <BottomNav user={initialUser} />
    </div>
  );
}
