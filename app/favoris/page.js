"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Footer from "@/app/components/Footer";
import PriceDisplay, { hasDiscount, discountPercent } from "@/app/components/PriceDisplay";

const CONDITION_LABELS = { neuf: "Neuf", quasi_neuf: "Quasi neuf", occasion: "Occasion" };

export default function FavorisPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    fetch("/api/favorites")
      .then((res) => {
        if (res.status === 401) {
          router.push("/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        setProducts(data.products || []);
        setLoading(false);
      });
  }

  useEffect(load, [router]);

  async function handleRemove(productId) {
    await fetch(`/api/favorites/${productId}`, { method: "DELETE" });
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  }

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/shop" className="brand" style={{ textDecoration: "none" }}>🛒 FasoShop</Link>
        <div className="topbar-actions">
          <Link href="/shop"><button>Catalogue</button></Link>
        </div>
      </div>
      <div className="woven-strip" />

      <div className="content">
        <div className="page-header">
          <h1>Mes favoris</h1>
        </div>

        {loading ? (
          <p>Chargement...</p>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <div className="glyph">♡</div>
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
                      🛍️
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
    </div>
  );
}
