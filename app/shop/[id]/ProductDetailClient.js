"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { addToCart } from "@/lib/cart";
import PriceDisplay, { hasDiscount, discountPercent } from "@/app/components/PriceDisplay";
import SiteHeader from "@/app/components/SiteHeader";
import BottomNav from "@/app/components/BottomNav";
import {
  PackageIcon, StoreIcon, BadgeCheckIcon, StarIcon, MessageIcon,
  ShoppingCartIcon, CheckCircleIcon, TruckIcon, SmartphoneIcon,
  RotateCcwIcon, AlertTriangleIcon, ClockIcon,
} from "@/app/components/Icons";

const CONDITION_LABELS = { neuf: "Neuf", quasi_neuf: "Quasi neuf", occasion: "Occasion" };
const CONDITION_COLORS = { neuf: "var(--gold-600)", quasi_neuf: "#6b7280", occasion: "var(--bissap-600)" };

async function startConversation(productId) {
  const res = await fetch("/api/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId }),
  });
  if (res.status === 401) { window.location.href = "/login"; return; }
  const data = await res.json();
  if (res.ok) window.location.href = `/messages/${data.conversationId}`;
  else alert(data.error || "Impossible de contacter le vendeur.");
}

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
                <div className="pdp-main-image-placeholder" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#999" }}>
                  <PackageIcon size={64} />
                </div>
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
              <StoreIcon size={18} />
              <span style={{ fontWeight: 600 }}>{product.shop_name || "Boutique partenaire"}</span>
              <span style={{ color: "var(--gold-600, #c9a44c)", display: "inline-flex" }}><BadgeCheckIcon size={16} /></span>
            </Link>

            {product.category_name && (
              <p className="pdp-category">{product.category_name}</p>
            )}

            {product.review_count > 0 && (
              <div className="pdp-rating" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <StarIcon size={18} style={{ color: "var(--gold-500)" }} />
                <strong>{product.avg_rating.toFixed(1)}</strong> / 5
                <span className="pdp-rating-count">({product.review_count} avis)</span>
              </div>
            )}

            <div className="pdp-price-block">
              <PriceDisplay product={product} />
            </div>

            {flashActive && (
              <div className="pdp-flash" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ClockIcon size={16} /> <strong>Vente flash :</strong> se termine dans {fh}h {fm}m {fs}s
              </div>
            )}

            {product.stock_quantity > 0 && product.stock_quantity <= 5 ? (
              <div className="pdp-stock-low" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <AlertTriangleIcon size={16} /> Plus que <strong>{product.stock_quantity}</strong> en stock — commandez vite !
              </div>
            ) : product.stock_quantity > 5 ? (
              <div className="pdp-stock-ok" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircleIcon size={16} /> En stock : {product.stock_quantity} disponibles
              </div>
            ) : null}

            <button
              ref={mainCtaRef}
              className="btn btn-primary pdp-add-btn"
              onClick={handleAdd}
              disabled={product.stock_quantity <= 0}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              {product.stock_quantity <= 0 ? (
                "Rupture de stock"
              ) : justAdded ? (
                <><CheckCircleIcon size={16} /> Ajouté</>
              ) : (
                <><ShoppingCartIcon size={16} /> Ajouter au panier</>
              )}
            </button>

            <button
              className="pdp-contact-btn"
              onClick={() => startConversation(product.id)}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              <MessageIcon size={16} /> Contacter le vendeur
            </button>

            <div className={"pdp-sticky-bar" + (ctaInView ? " is-hidden" : "")}>
              <div className="pdp-sticky-price"><PriceDisplay product={product} /></div>
              <button className="pdp-sticky-contact" onClick={() => startConversation(product.id)} aria-label="Contacter le vendeur" style={{ display: "inline-flex" }}>
                <MessageIcon size={18} />
              </button>
              <button className="btn btn-primary pdp-sticky-add" onClick={handleAdd} disabled={product.stock_quantity <= 0} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {product.stock_quantity <= 0 ? (
                  "Rupture"
                ) : justAdded ? (
                  <><CheckCircleIcon size={14} /> Ajouté</>
                ) : (
                  <><ShoppingCartIcon size={14} /> Ajouter</>
                )}
              </button>
            </div>

            <div className="pdp-trust" style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: "0.85rem" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><TruckIcon size={14} /> Livraison vendeur</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><SmartphoneIcon size={14} /> Mobile Money</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><RotateCcwIcon size={14} /> 7 jours</span>
            </div>

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
                <div style={{ marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                  <TruckIcon size={14} />
                  <div><strong>Livraison à domicile par {product.shop_name}</strong> :{" "}
                  <strong>{deliveryFee === 0 ? "Gratuite" : `${deliveryFee.toLocaleString("fr-FR")} FCFA`}</strong></div>
                </div>
              )}
              {product.offers_pickup !== false && (
                <div style={{ marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                  <StoreIcon size={14} />
                  <div><strong>Retrait en boutique</strong> :{" "}
                  <strong style={{ color: "#2f7a3d" }}>Gratuit</strong></div>
                </div>
              )}
              <div style={{ color: "#3a6b3a", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 6 }}>
                <SmartphoneIcon size={12} />
                <span>Espèces ou Mobile Money — paiement sécurisé par Kimoxa.</span>
              </div>
            </div>
          </div>
        </div>

        {product.description && (
          <div className="panel pdp-description">
            <h2>Description</h2>
            <p>{product.description}</p>
          </div>
        )}

        <div className="panel">
          <h2>Avis clients</h2>

          {reviews.length === 0 ? (
            <p style={{ color: "var(--ink-400)" }}>Aucun avis pour l'instant.</p>
          ) : (
            <div>
              {reviews.map((r) => (
                <div key={r.id} className="pdp-review">
                  <div className="pdp-review-stars" style={{ display: "inline-flex", gap: 2 }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <StarIcon key={i} size={14} style={{ color: i < r.rating ? "var(--gold-500)" : "#d4d4d4" }} />
                    ))}
                  </div>
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
