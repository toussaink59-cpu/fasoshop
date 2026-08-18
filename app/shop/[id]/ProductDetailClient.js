"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { addToCart } from "@/lib/cart";
import PriceDisplay, { hasDiscount, discountPercent } from "@/app/components/PriceDisplay";
import SiteHeader from "@/app/components/SiteHeader";
import BottomNav from "@/app/components/BottomNav";

const CONDITION_LABELS = { neuf: "Neuf", quasi_neuf: "Quasi neuf", occasion: "Occasion" };
const CONDITION_COLORS = { neuf: "var(--gold-600)", quasi_neuf: "#6b7280", occasion: "var(--bissap-600)" };

export default function ProductDetailClient({ id, product, initialReviews, initialUser, categories }) {
  const [reviews, setReviews] = useState(initialReviews);
  const [justAdded, setJustAdded] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState("");
  const [now, setNow] = useState(() => new Date());
  const [mainImg, setMainImg] = useState(0);
  const [ctaInView, setCtaInView] = useState(true);
  const mainCtaRef = useRef(null);

  useEffect(() => {
    const el = mainCtaRef.current;
    if (!el) return;
    const onScroll = () => {
      const r = el.getBoundingClientRect();
      setCtaInView(r.top < window.innerHeight && r.bottom > 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  function handleAdd() {
    addToCart(product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  }

  async function handleSubmitReview(e) {
    e.preventDefault();
    setReviewError("");
    setReviewSuccess("");

    const res = await fetch(`/api/products/${id}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, comment }),
    });
    const data = await res.json();

    if (!res.ok) {
      setReviewError(data.error || "Erreur lors de l'envoi de l'avis.");
      return;
    }

    setReviewSuccess("Votre avis a été enregistré, merci !");
    setComment("");
    fetch(`/api/products/${id}/reviews`)
      .then((r) => r.json())
      .then((data) => setReviews(data.reviews || []));
  }

  const user = initialUser;

  const flashEnds = product.flash_sale_ends_at ? new Date(product.flash_sale_ends_at) : null;
  const flashActive = flashEnds && flashEnds > now;
  const flashDiff = flashActive ? flashEnds - now : 0;
  const fh = Math.floor(flashDiff / 3600000);
  const fm = Math.floor((flashDiff % 3600000) / 60000);
  const fs = Math.floor((flashDiff % 60000) / 1000);

  const images = product.images && product.images.length > 0 ? product.images : [];
  const deliveryFee = Number(product.delivery_fee) || 0;

  return (
    <div className="shell">
      <SiteHeader initialUser={initialUser} categories={categories} />

      <div className="content">
        <Link href="/shop" className="pdp-back">← Retour au catalogue</Link>

        <div className="pdp-main">
          {/* Galerie */}
          <div className="pdp-gallery">
            <div className="pdp-main-image">
              {hasDiscount(product) && (
                <span className="pdp-discount-badge">-{discountPercent(product)}%</span>
              )}
              {images.length > 0 ? (
                <Image
                  src={images[mainImg]}
                  alt={product.name}
                  width={800}
                  height={800}
                  sizes="(max-width: 900px) 100vw, 50vw"
                  priority
                  unoptimized
                />
              ) : (
                <div className="pdp-main-image-placeholder">📦</div>
              )}
            </div>
            {images.length > 1 && (
              <div className="pdp-thumbs">
                {images.map((url, idx) => (
                  <button
                    key={idx}
                    className={`pdp-thumb ${idx === mainImg ? "is-active" : ""}`}
                    onClick={() => setMainImg(idx)}
                    type="button"
                  >
                    <Image src={url} alt={`Miniature ${idx + 1}`} width={80} height={80} loading="lazy" unoptimized />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Encadré achat */}
          <div className="pdp-buy-box">
            <div className="pdp-title-row">
              <h1>{product.name}</h1>
              <span
                className="pdp-condition"
                style={{ background: CONDITION_COLORS[product.condition] || "var(--gold-600)" }}
              >
                {CONDITION_LABELS[product.condition] || "Neuf"}
              </span>
            </div>

            <Link
              href={`/boutique/${product.shop_id}`}
              className="pdp-shop-name"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 12px",
                background: "var(--cream-100, #faf7f2)",
                border: "1px solid var(--border, #e5e5e5)",
                borderRadius: 8,
                textDecoration: "none",
                color: "var(--ink-900, #1a1a1a)",
                marginTop: 4,
                marginBottom: 12,
              }}
            >
              <span style={{ fontSize: "1.1rem" }}>🏪</span>
              <span style={{ fontWeight: 600 }}>{product.shop_name || "Boutique partenaire"}</span>
              <span style={{ color: "var(--gold-600, #c9a44c)", fontWeight: 700 }}>✓</span>
            </Link>

            {product.category_name && (
              <p className="pdp-category">📂 {product.category_name}</p>
            )}

            {product.review_count > 0 && (
              <div className="pdp-rating">
                ⭐ {product.avg_rating.toFixed(1)} / 5
                <span className="pdp-rating-count">({product.review_count} avis)</span>
              </div>
            )}

            <div className="pdp-price-block">
              <PriceDisplay product={product} />
            </div>

            {flashActive && (
              <div className="pdp-flash">
                ⚡ <strong>Vente flash :</strong> se termine dans {fh}h {fm}m {fs}s
              </div>
            )}

            {product.stock_quantity > 0 && product.stock_quantity <= 5 ? (
              <div className="pdp-stock-low">
                🔥 Plus que <strong>{product.stock_quantity}</strong> en stock — commandez vite !
              </div>
            ) : product.stock_quantity > 5 ? (
              <div className="pdp-stock-ok">✅ En stock : {product.stock_quantity} disponibles</div>
            ) : null}

            <button
              ref={mainCtaRef}
              className="btn btn-primary pdp-add-btn"
              onClick={handleAdd}
              disabled={product.stock_quantity <= 0}
            >
              {product.stock_quantity <= 0
                ? "Rupture de stock"
                : justAdded
                ? "Ajouté ✓"
                : "Ajouter au panier"}
            </button>

            <div className={"pdp-sticky-bar" + (ctaInView ? " is-hidden" : "")}>
              <div className="pdp-sticky-price"><PriceDisplay product={product} /></div>
              <button className="btn btn-primary pdp-sticky-add" onClick={handleAdd} disabled={product.stock_quantity <= 0}>
                {product.stock_quantity <= 0 ? "Rupture de stock" : justAdded ? "Ajouté ✓" : "Ajouter au panier"}
              </button>
            </div>

            <div className="pdp-trust">
              <span>🚚 Livraison vendeur</span>
              <span>📱 Mobile Money</span>
              <span>↩️ 7 jours</span>
            </div>

            {/* 🚚🏪 OPTIONS LIVRAISON — modèle v3 (le vendeur décide) */}
            <div
              style={{
                marginTop: 16,
                padding: "12px 14px",
                background: "#f0f9f0",
                border: "1px solid #86d68a",
                borderRadius: 8,
                fontSize: "0.85rem",
                color: "#1a4a1a",
              }}
            >
              {product.offers_delivery !== false && (
                <div style={{ marginBottom: 4 }}>
                  🚚 <strong>Livraison à domicile par {product.shop_name}</strong> :{" "}
                  <strong>{deliveryFee === 0 ? "Gratuite" : `${deliveryFee.toLocaleString("fr-FR")} FCFA`}</strong>
                </div>
              )}
              {product.offers_pickup !== false && (
                <div style={{ marginBottom: 4 }}>
                  🏪 <strong>Retrait en boutique</strong> :{" "}
                  <strong style={{ color: "#2f7a3d" }}>Gratuit</strong>
                </div>
              )}
              <div style={{ color: "#3a6b3a", fontSize: "0.8rem" }}>
                💵 Espèces ou 📱 Mobile Money — paiement sécurisé par Kimoxa.
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div className="panel pdp-description">
            <h2>Description</h2>
            <p>{product.description}</p>
          </div>
        )}

        {/* Avis clients */}
        <div className="panel">
          <h2>Avis clients</h2>

          {reviews.length === 0 ? (
            <p style={{ color: "var(--ink-400)" }}>Aucun avis pour l'instant.</p>
          ) : (
            <div>
              {reviews.map((r) => (
                <div key={r.id} className="pdp-review">
                  <div className="pdp-review-stars">{"⭐".repeat(r.rating)}</div>
                  <div className="pdp-review-author">{r.buyer_name}</div>
                  {r.comment && <p className="pdp-review-comment">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}

          {user && user.role === "buyer" && (
            <form onSubmit={handleSubmitReview} className="pdp-review-form">
              <h3>Laisser un avis</h3>
              {reviewError && <div className="error-box">{reviewError}</div>}
              {reviewSuccess && <div className="success-box">{reviewSuccess}</div>}
              <div>
                <label htmlFor="review-rating">Note</label>
                <select id="review-rating" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>{n} étoile{n > 1 ? "s" : ""}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="review-comment">Commentaire (optionnel)</label>
                <textarea
                  id="review-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  placeholder="Votre expérience avec ce produit..."
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: 10 }}>
                Envoyer l'avis
              </button>
            </form>
          )}

          {!user && (
            <p style={{ marginTop: 16, fontSize: "0.85rem" }}>
              <Link href="/login">Connectez-vous</Link> pour laisser un avis après votre achat.
            </p>
          )}
        </div>
      </div>
      <BottomNav user={initialUser} />
    </div>
  );
}