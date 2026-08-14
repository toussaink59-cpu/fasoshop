"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminInsights() {
  const [analytics, setAnalytics] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [shops, setShops] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/analytics").then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
      fetch("/api/admin/earnings").then((r) => r.json()).catch(() => ({})),
      fetch("/api/admin/shops").then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
    ]).then(([a, e, sh]) => {
      setAnalytics(a || null);
      setEarnings(e.earnings || null);
      setShops(sh.shops || []);
      setLoaded(true);
    });
  }, []);

  if (!loaded) return null;

  const topVendors = analytics?.salesByVendor || [];
  const releasedCount = Number(earnings?.released_count || 0);
  const pendingShops = shops.filter((s) => s.status === "pending");

  return (
    <div className="va-row3">
      {/* Payouts à libérer */}
      <div className="va-card">
        <h3>
          💸 Payouts à libérer{" "}
          <Link href="/admin/payouts" className="va-seeall">Voir tout →</Link>
        </h3>
        {releasedCount === 0 ? (
          <div className="va-empty"><p>Aucun payout à traiter.</p></div>
        ) : (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "#16a34a" }}>
              {releasedCount}
            </div>
            <div style={{ fontSize: "0.9rem", color: "var(--ink-400,#888)" }}>
              vendeur{releasedCount > 1 ? "s" : ""} en attente de paiement
            </div>
            <Link href="/admin/payouts" className="btn btn-primary" style={{ marginTop: 12, display: "inline-block" }}>
              Traiter les payouts →
            </Link>
          </div>
        )}
      </div>

      {/* Top vendeurs */}
      <div className="va-card">
        <h3>🏆 Top vendeurs</h3>
        {topVendors.length === 0 ? (
          <div className="va-empty"><p>Pas encore de ventes.</p></div>
        ) : (
          <ul className="va-list">
            {topVendors.slice(0, 5).map((v, i) => (
              <li key={v.shop_name} className="va-list-item">
                <span className="va-rank">{i + 1}</span>
                <span className="va-list-main">{v.shop_name}</span>
                <span className="va-list-sub">{Number(v.revenue).toLocaleString("fr-FR")} FCFA</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Boutiques en attente */}
      <div className="va-card">
        <h3>
          ⏳ Boutiques en attente{" "}
          <Link href="/admin/shops" className="va-seeall">Voir tout →</Link>
        </h3>
        {pendingShops.length === 0 ? (
          <div className="va-empty"><p>Aucune boutique à vérifier.</p></div>
        ) : (
          <ul className="va-list">
            {pendingShops.slice(0, 5).map((s) => (
              <li key={s.id} className="va-list-item">
                <span className="va-list-main">{s.name}</span>
                <span className="va-badge" style={{ color: "#f59e0b", borderColor: "#f59e0b" }}>
                  En attente
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}