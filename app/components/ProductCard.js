"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { addToCart, getCart, cartCount } from "@/lib/cart";
import PriceDisplay, { hasDiscount, discountPercent } from "@/app/components/PriceDisplay";
import { HeartIcon, BadgeCheckIcon, StarIcon, PackageIcon, CheckCircleIcon } from "@/app/components/Icons";

const CONDITION_LABELS = { neuf: "Neuf", quasi_neuf: "Quasi neuf", occasion: "Occasion" };
const CONDITION_COLORS = { neuf: "var(--gold-600)", quasi_neuf: "#6b7280", occasion: "var(--bissap-600)" };

export function Stars({ rating }) {
  const rounded = Math.round(Number(rating) || 0);
  return (
    <span className="stars" aria-label={`${rating} sur 5`} style={{ display: "inline-flex", gap: 1 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <StarIcon key={i} size={14} style={{ color: i < rounded ? "var(--gold-500)" : "#d4d4d4" }} />
      ))}
    </span>
  );
}

export default function ProductCard({ p, user, compact = false }) {
  const router = useRouter();

  const [favorited, setFavorited] = useState(Boolean(p.is_favorited));
  const [favBusy, setFavBusy] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  if (p.stock_quantity <= 0) return null;

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

  return (
    <div className={`product-card shop-card ${compact ? "shop-card-compact" : ""}`}>
      <button
        className={`shop-card-fav ${favorited ? "shop-card-fav-active" : ""}`}
        onClick={handleFav}
        disabled={favBusy}
        aria-label={favorited ? "Retirer des favoris" : "Ajouter aux favoris"}
        title={favorited ? "Retirer des favoris" : "Ajouter aux favoris"}
      >
        <HeartIcon size={20} style={{ fill: favorited ? "#e53935" : "none" }} />
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
            <Image
              src={p.images[0]}
              alt={p.name}
              width={400}
              height={400}
              sizes="(max-width: 700px) 50vw, 220px"
              className="shop-card-image"
              loading="lazy"
            />
          ) : (
            <div className="shop-card-image shop-card-image-placeholder" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#999" }}>
              <PackageIcon size={48} />
            </div>
          )}
        </div>
        <div className="name shop-card-name">{p.name}</div>
      </Link>

      <span
        className="shop-card-condition"
        style={{ background: CONDITION_COLORS[p.condition] || "var(--gold-600)" }}
      >
        {CONDITION_LABELS[p.condition] || "Neuf"}
      </span>

      <div className="shop-card-shop-row">
        <span className="shop">Kimoxa</span>
        <span className="shop-card-verified" title="Vendeur vérifié" style={{ color: "var(--gold-600)", display: "inline-flex", alignItems: "center" }}>
          <BadgeCheckIcon size={16} />
        </span>
      </div>

      {Number(p.review_count) > 0 && (
        <div className="shop-card-rating">
          <Stars rating={p.avg_rating} />
          <span className="shop-card-rating-count">({p.review_count})</span>
        </div>
      )}

      <PriceDisplay product={p} />

      <button className="btn btn-primary" onClick={handleAdd} disabled={p.stock_quantity <= 0}>
        {p.stock_quantity <= 0 ? (
          "Rupture de stock"
        ) : justAdded ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <CheckCircleIcon size={16} /> Ajouté
          </span>
        ) : (
          "Ajouter au panier"
        )}
      </button>
    </div>
  );
}
