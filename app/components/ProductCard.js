"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { addToCart, getCart, cartCount } from "@/lib/cart";
import PriceDisplay, { hasDiscount, discountPercent } from "@/app/components/PriceDisplay";

const CONDITION_LABELS = { neuf: "Neuf", quasi_neuf: "Quasi neuf", occasion: "Occasion" };
const CONDITION_COLORS = { neuf: "var(--gold-600)", quasi_neuf: "#6b7280", occasion: "var(--bissap-600)" };

// Émojis par catégorie pour les placeholders
const CATEGORY_ICONS = {
  electronique: "📱",
  telephones: "📱",
  mode: "👗",
  vetements: "👗",
  beaute: "💄",
  maison: "🏠",
  cuisine: "🍳",
  sport: "⚽",
  livres: "📚",
  jouets: "🧸",
  auto: "🚗",
};

export function Stars({ rating }) {
  const rounded = Math.round(Number(rating) || 0);
  return (
    <span className="stars" aria-label={`${rating} sur 5`}>
      {"★".repeat(rounded)}
      {"☆".repeat(5 - rounded)}
    </span>
  );
}

export default function ProductCard({ p, user, compact = false }) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(Boolean(p.is_favorited));
  const [favBusy, setFavBusy] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  async function handleFav(e) {
    e.preventDefault();
    if (!user) {
      router.push("/login");
      return;
    }
    setFavBusy(true);
    if (favorited) {
      await fetch(`/api/favorites/${p.id}`, { method: "DELETE" });
      setFavorited(false);
    } else {
      await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: p.id }),
      });
      setFavorited(true);
    }
    setFavBusy(false);
  }

  function handleAdd() {
    addToCart(p);
    cartCount(getCart());
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  }

  // Émoji de catégorie pour le placeholder
  const categorySlug = (p.category_slug || p.category_name || "").toLowerCase();
  const placeholderIcon = CATEGORY_ICONS[categorySlug] || "🛍️";

  return (
    <div className={`product-card shop-card ${compact ? "shop-card-compact" : ""}`}>
      <button
        className={`shop-card-fav ${favorited ? "shop-card-fav-active" : ""}`}
        onClick={handleFav}
        disabled={favBusy}
        aria-label={favorited ? "Retirer des favoris" : "Ajouter aux favoris"}
      >
        {favorited ? "♥" : "♡"}
      </button>

      <Link href={`/shop/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
        <div className="shop-card-image-wrap">
          {hasDiscount(p) && <span className="badge-discount">-{discountPercent(p)}%</span>}
          {p.is_sponsored ? (
            <span className="shop-card-badge-sponsored">Sponsorisé</span>
          ) : p.isNew ? (
            <span className="shop-card-badge-new">Nouveau</span>
          ) : null}
          {p.images && p.images.length > 0 ? (
            <img src={p.images[0]} alt={p.name} className="shop-card-image" loading="lazy" />
          ) : (
            <div className="shop-card-image shop-card-image-placeholder">{placeholderIcon}</div>
          )}
        </div>
        <div className="shop-card-info">
          <div className="name shop-card-name">{p.name}</div>
          <span
            className="shop-card-condition"
            style={{ background: CONDITION_COLORS[p.condition] || "var(--gold-600)" }}
          >
            {CONDITION_LABELS[p.condition] || "Neuf"}
          </span>
          <div className="shop-card-shop-row">
            <span className="shop">{p.shop_name}</span>
            {p.shop_verified && (
              <span className="shop-card-verified" title="Boutique vérifiée">✓</span>
            )}
          </div>
          {Number(p.review_count) > 0 && (
            <div className="shop-card-rating">
              <Stars rating={p.avg_rating} />
              <span className="shop-card-rating-count">({p.review_count})</span>
            </div>
          )}
          <PriceDisplay product={p} />
        </div>
      </Link>

      <button className="btn btn-primary shop-card-add-btn" onClick={handleAdd} disabled={p.stock_quantity <= 0}>
        {p.stock_quantity <= 0 ? "Rupture" : justAdded ? "✓" : "+ Panier"}
      </button>
    </div>
  );
}
