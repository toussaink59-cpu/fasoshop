"use client";

import { useState } from "react";
import Link from "next/link";
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

  return (
    <div className="shell">
      <SiteHeader initialUser={initialUser} categories={categories} />

      <div className="content">
        <Link href="/shop" style={{ fontSize: "0.85rem", color: "var(--gold-600)" }}>
          ← Retour au catalogue
        </Link>

        <div className="panel" style={{ marginTop: 16 }}>
          {hasDiscount(product) && (
            <span className="badge-discount">-{discountPercent(product)}%</span>
          )}

          {product.images && product.images.length > 0 && (
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {product.images.map((url, idx) => (
                <img
                  key={idx}
                  src={url}
                  alt={`${product.name} - photo ${idx + 1}`}
                  style={{ width: 140, height: 140, objectFit: "cover", borderRadius: 8, border: "1px solid var(--sand-200)" }}
                />
              ))}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ margin: 0 }}>{product.name}</h1>
            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "white",
                background: CONDITION_COLORS[product.condition] || "var(--gold-600)",
                borderRadius: 999,
                padding: "3px 12px",
              }}
            >
              {CONDITION_LABELS[product.condition] || "Neuf"}
            </span>
          </div>
          <p style={{ color: "var(--ink-400)" }}>{product.shop_name}</p>
          {product.category_name && (
            <p style={{ fontSize: "0.85rem", color: "var(--ink-400)" }}>
              Catégorie : {product.category_name}
            </p>
          )}

          {product.review_count > 0 && (
            <p>⭐ {product.avg_rating.toFixed(1)} / 5 ({product.review_count} avis)</p>
          )}

          <PriceDisplay product={product} />

          {product.description && (
            <p style={{ marginTop: 12 }}>{product.description}</p>
          )}

          <button
            className="btn btn-primary"
            onClick={handleAdd}
            disabled={product.stock_quantity <= 0}
            style={{ marginTop: 16 }}
          >
            {product.stock_quantity <= 0
              ? "Rupture de stock"
              : justAdded
              ? "Ajouté ✓"
              : "Ajouter au panier"}
          </button>
        </div>

        <div className="panel">
          <h2>Avis clients</h2>

          {reviews.length === 0 ? (
            <p style={{ color: "var(--ink-400)" }}>Aucun avis pour l'instant.</p>
          ) : (
            <div>
              {reviews.map((r) => (
                <div key={r.id} style={{ borderBottom: "1px solid var(--sand-200)", padding: "10px 0" }}>
                  <div>{"⭐".repeat(r.rating)}</div>
                  <div style={{ fontWeight: 600 }}>{r.buyer_name}</div>
                  {r.comment && <p>{r.comment}</p>}
                </div>
              ))}
            </div>
          )}

          {user && user.role === "buyer" && (
            <form onSubmit={handleSubmitReview} style={{ marginTop: 20 }}>
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
