"use client";

import { ClockIcon, TrophyIcon, StarIcon, ArrowRightIcon } from "@/app/components/Icons";
import { useEffect, useState } from "react";
import Link from "next/link";

const STATUS_BADGES = {
  preparation: { label: "En attente", color: "#f59e0b" },
  shipped: { label: "En livraison", color: "#2563eb" },
  delivered: { label: "Livrée", color: "#16a34a" },
  cancelled: { label: "Annulée", color: "#dc2626" },
};

function Stars({ rating }) {
  const n = Math.round(Number(rating) || 0);
  return <span style={{ display: "inline-flex", gap: 1 }}>
    {Array.from({ length: 5 }).map((_, i) => (
      <StarIcon key={i} size={14} style={{ color: i < n ? "var(--gold-500)" : "#d4d4d4", fill: i < n ? "var(--gold-500)" : "#d4d4d4" }} />
    ))}
  </span>;
}

export default function VendorInsights() {
  const [items, setItems] = useState([]);
  const [top, setTop] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/vendor/orders").then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
      fetch("/api/vendor/insights").then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
    ]).then(([o, ins]) => {
      setItems(o.items || []);
      setTop(ins.topProducts || []);
      setReviews(ins.recentReviews || []);
      setLoaded(true);
    });
  }, []);

  if (!loaded) return null;

  // 5 dernières commandes (order_id uniques)
  const seen = new Set();
  const recent = [];
  for (const it of items) {
    if (!seen.has(it.order_id)) {
      seen.add(it.order_id);
      recent.push(it);
    }
    if (recent.length >= 5) break;
  }

  return (
    <div className="va-row3">
      {/* Commandes récentes */}
      <div className="va-card">
        <h3>
          <ClockIcon size={16} style={{ marginRight: 4 }} /> Commandes récentes{" "}
          <Link href="/vendor/orders" className="va-seeall">Voir tout <ArrowRightIcon size={14} style={{ marginLeft: 2 }} /></Link>
        </h3>
        {recent.length === 0 ? (
          <div className="va-empty"><p>Aucune commande pour l'instant.</p></div>
        ) : (
          <ul className="va-list">
            {recent.map((it) => {
              const b = STATUS_BADGES[it.delivery_status] || STATUS_BADGES.preparation;
              return (
                <li key={it.order_id} className="va-list-item">
                  <span className="va-list-main">Commande #{it.order_id}</span>
                  <span className="va-badge" style={{ color: b.color, borderColor: b.color }}>
                    {b.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Top produits */}
      <div className="va-card">
        <h3><TrophyIcon size={16} style={{ marginRight: 4 }} /> Produits les plus vendus</h3>
        {top.length === 0 ? (
          <div className="va-empty"><p>Pas encore de ventes.</p></div>
        ) : (
          <ul className="va-list">
            {top.map((p, i) => (
              <li key={p.id} className="va-list-item">
                <span className="va-rank">{i + 1}</span>
                <span className="va-list-main">{p.name}</span>
                <span className="va-list-sub">{Number(p.sold)} vendus</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Avis récents */}
      <div className="va-card">
        <h3><StarIcon size={16} style={{ marginRight: 4, color: "var(--gold-500)" }} /> Avis récents</h3>
        {reviews.length === 0 ? (
          <div className="va-empty"><p>Aucun avis pour le moment.</p></div>
        ) : (
          <ul className="va-list">
            {reviews.map((r, i) => (
              <li key={i} className="va-list-item va-list-col">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <strong>{r.author}</strong>
                  <span className="va-stars"><Stars rating={r.rating} /></span>
                </div>
                {r.comment && <p className="va-comment">{r.comment}</p>}
                <span className="va-list-sub">{r.product_name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}