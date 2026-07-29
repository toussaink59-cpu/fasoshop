"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Footer from "@/app/components/Footer";

export default function NosVendeursPage() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/shops/directory")
      .then((r) => r.json())
      .then((d) => {
        setShops(d.shops || []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/" className="brand" style={{ textDecoration: "none" }}>🛒 FasoShop</Link>
        <div className="topbar-actions">
          <Link href="/devenir-vendeur"><button>Devenir vendeur</button></Link>
        </div>
      </div>
      <div className="woven-strip" />

      <div className="content">
        <div className="page-header">
          <h1>Nos vendeurs</h1>
          <p>Des boutiques locales vérifiées, présentes partout au Burkina Faso.</p>
        </div>

        {loading ? (
          <p>Chargement...</p>
        ) : shops.length === 0 ? (
          <div className="empty-state">
            <div className="glyph">🏪</div>
            <p>Aucune boutique active pour l'instant.</p>
          </div>
        ) : (
          <div className="product-grid">
            {shops.map((s) => (
              <Link
                key={s.id}
                href={`/shop?shopId=${s.id}`}
                className="product-card"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div className="name">🏪 {s.name}</div>
                <div className="shop">{s.vendor_name}</div>
                <div style={{ marginTop: 6, fontSize: "0.9rem" }}>
                  {Number(s.review_count) > 0 ? (
                    <>⭐ {s.avg_rating} ({s.review_count} avis)</>
                  ) : (
                    <span style={{ color: "var(--ink-400)" }}>Pas encore d'avis</span>
                  )}
                </div>
                <div style={{ color: "var(--ink-400)", fontSize: "0.85rem" }}>
                  {s.product_count} produit{s.product_count > 1 ? "s" : ""}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
