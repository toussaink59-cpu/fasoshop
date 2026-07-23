"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { addToCart, getCart, cartCount } from "@/lib/cart";
import PriceDisplay, { hasDiscount, discountPercent } from "@/app/components/PriceDisplay";

function ShopContent() {
  const searchParams = useSearchParams();
  const categorySlug = searchParams.get("category");

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [justAdded, setJustAdded] = useState(null);
  const [categoryLabel, setCategoryLabel] = useState(null);

  useEffect(() => {
    setLoading(true);
    const url = categorySlug
      ? `/api/products?category=${encodeURIComponent(categorySlug)}`
      : "/api/products";

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setProducts(data.products || []);
        setLoading(false);
        if (data.products?.length && categorySlug) {
          setCategoryLabel(data.products[0].category_name || null);
        } else if (!categorySlug) {
          setCategoryLabel(null);
        }
      });
    setCount(cartCount(getCart()));
  }, [categorySlug]);

  function handleAdd(product) {
    addToCart(product);
    setCount(cartCount(getCart()));
    setJustAdded(product.id);
    setTimeout(() => setJustAdded(null), 1200);
  }

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/" className="brand" style={{ textDecoration: "none" }}>
          🛒 FasoShop
        </Link>
        <div className="topbar-actions">
          <Link href="/login"><button>Se connecter</button></Link>
        </div>
      </div>
      <div className="woven-strip" />

      <div className="content">
        <div className="page-header">
          <h1>{categorySlug ? categoryLabel || "Catalogue" : "Catalogue"}</h1>
          <p>
            {categorySlug
              ? "Produits filtrés par catégorie."
              : "Des produits vendus par des boutiques locales, partout au Burkina Faso."}
          </p>
          {categorySlug && (
            <Link href="/shop" style={{ fontSize: "0.85rem", color: "var(--gold-600)" }}>
              ← Voir tout le catalogue
            </Link>
          )}
        </div>

        {loading ? (
          <p>Chargement...</p>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <div className="glyph">🛍️</div>
            <p>Aucun produit disponible dans cette catégorie pour l'instant.</p>
          </div>
        ) : (
          <div className="product-grid">
            {products.map((p) => (
              <div className="product-card" key={p.id}>
                {hasDiscount(p) && (
                  <span className="badge-discount">-{discountPercent(p)}%</span>
                )}
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
                <div className="shop">{p.shop_name}</div>
                <PriceDisplay product={p} />
                <button
                  className="btn btn-primary"
                  onClick={() => handleAdd(p)}
                  disabled={p.stock_quantity <= 0}
                >
                  {p.stock_quantity <= 0
                    ? "Rupture de stock"
                    : justAdded === p.id
                    ? "Ajouté ✓"
                    : "Ajouter au panier"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {count > 0 && (
        <Link href="/cart" className="cart-fab">
          🛒 Panier ({count})
        </Link>
      )}
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="shell"><div className="content"><p>Chargement...</p></div></div>}>
      <ShopContent />
    </Suspense>
  );
}