"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const fmt = (n) => Number(n || 0).toLocaleString("fr-FR");

// Graphique en aire SVG réutilisable
function AreaChart({ series, labelKey = "label", valueKey = "gross", color = "#e6a623" }) {
  const W = 700, H = 220, P = 30;
  const values = series.map((s) => Number(s[valueKey]) || 0);
  const max = Math.max(...values, 1);
  const stepX = series.length > 1 ? (W - P * 2) / (series.length - 1) : 0;
  const pts = values.map((v, i) => [P + i * stepX, H - P - (v / max) * (H - P * 2)]);
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${(P + (series.length - 1) * stepX).toFixed(1)},${H - P} L${P},${H - P} Z`;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }} role="img" aria-label="Évolution du chiffre d'affaires">
        <path d={area} fill="rgba(230,166,35,0.14)" />
        <path d={line} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="4" fill={color} stroke="#fff" strokeWidth="1.5" />
        ))}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--ink-400,#888)", padding: "0 8px", flexWrap: "wrap" }}>
        {series.filter((_, i) => i % Math.ceil(series.length / 7) === 0 || i === series.length - 1).map((s, idx) => (
          <span key={idx}>{s[labelKey]}</span>
        ))}
      </div>
    </div>
  );
}

// Donut SVG
function Donut({ segments, total }) {
  const R = 54, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <svg viewBox="0 0 140 140" style={{ width: 160, height: 160 }} role="img" aria-label="Répartition des commandes">
      <circle cx="70" cy="70" r={R} fill="none" stroke="#f0ede6" strokeWidth="18" />
      {total > 0 && segments.filter((s) => s.value > 0).map((s, i) => {
        const frac = s.value / total;
        const dash = frac * C;
        const off = -acc * C;
        acc += frac;
        return (
          <circle key={i} cx="70" cy="70" r={R} fill="none" stroke={s.color} strokeWidth="18"
            strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={off}
            transform="rotate(-90 70 70)" />
        );
      })}
      <text x="70" y="66" textAnchor="middle" fontSize="24" fontWeight="800" fill="#222">{total}</text>
      <text x="70" y="86" textAnchor="middle" fontSize="11" fill="#888">commandes</text>
    </svg>
  );
}

export default function AdminAnalytics() {
  const [earnings, setEarnings] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [series30, setSeries30] = useState([]);
  const [orders, setOrders] = useState([]);
  const [orderStats, setOrderStats] = useState(null);
  const [shops, setShops] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/earnings").then((r) => r.json()).catch(() => ({})),
      fetch("/api/admin/analytics").then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
      fetch("/api/admin/analytics/series?mode=range&days=30").then((r) => r.json()).catch(() => ({})),
      fetch("/api/admin/orders").then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
      fetch("/api/admin/shops").then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
    ]).then(([e, a, s, o, sh]) => {
      setEarnings(e.earnings || null);
      setAnalytics(a || null);
      setSeries30(s.series || []);
      setOrders(o.orders || []);
      setOrderStats(o.stats || null);
      setShops(sh.shops || []);
      setLoaded(true);
    });
  }, []);

  if (!loaded) {
    return <div className="va-card" style={{ margin: "16px 0" }}><div className="va-empty">Chargement des statistiques plateforme…</div></div>;
  }

  const totalGross = Number(earnings?.total_gross || 0);
  const totalCommission = Number(earnings?.total_commission || 0);
  const held = Number(earnings?.held_amount || 0);
  const released = Number(earnings?.released_amount || 0);
  const paid = Number(earnings?.paid_amount || 0);

  const activeShops = shops.filter((s) => s.status === "active").length;
  const pendingShops = shops.filter((s) => s.status === "pending").length;
  const totalOrders = orders.length;

  // Commandes par statut
  const byStatus = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});
  const countPaid = byStatus.paid || 0;
  const countShipped = byStatus.shipped || 0;
  const countDelivered = byStatus.delivered || 0;
  const countPending = byStatus.pending || 0;

  const hasActivity = totalOrders > 0 || totalGross > 0 || series30.some((s) => s.gross > 0);

  const kpis = [
    { icon: "🛒", label: "Commandes totales", value: fmt(orderStats?.orders_total ?? totalOrders) },
    { icon: "✅", label: "Livrées", value: fmt(countDelivered) },
    { icon: "🏪", label: "Boutiques actives", value: fmt(activeShops) },
    { icon: "💰", label: "CA global", value: `${fmt(totalGross)} FCFA` },
    { icon: "📊", label: "Commissions (8%)", value: `${fmt(totalCommission)} FCFA` },
    { icon: "⏳", label: "Payouts à libérer", value: `${fmt(released)} FCFA` },
  ];

  return (
    <section style={{ margin: "16px 0" }}>
      {/* 6 cartes KPI plateforme */}
      <div className="va-kpi-grid">
        {kpis.map((k) => (
          <div className="va-kpi" key={k.label}>
            <div className="icon">{k.icon}</div>
            <div className="value">{k.value}</div>
            <div className="label">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Résumé escrow */}
      <div className="va-card" style={{ marginBottom: 12, display: "flex", gap: 18, flexWrap: "wrap", justifyContent: "space-between" }}>
        <span>🔒 Séquestrés : <strong>{fmt(held)} FCFA</strong></span>
        <span>✅ À payer vendeurs : <strong>{fmt(released)} FCFA</strong></span>
        <span>💸 Déjà payés : <strong>{fmt(paid)} FCFA</strong></span>
      </div>

      <div className="va-row">
        {/* Courbe CA 30 jours */}
        <div className="va-card">
          <h3>📈 Évolution du chiffre d'affaires (30 jours)</h3>
          {hasActivity ? (
            <AreaChart series={series30} labelKey="label" valueKey="gross" color="#e6a623" />
          ) : (
            <div className="va-empty">
              <div style={{ fontSize: "2rem" }}>📈</div>
              <p>Les ventes apparaîtront ici dès les premières commandes.</p>
            </div>
          )}
        </div>

        {/* Donut répartition */}
        <div className="va-card" style={{ textAlign: "center" }}>
          <h3>🍩 Répartition des commandes récentes</h3>
          {totalOrders > 0 ? (
            <>
              <Donut
                total={totalOrders}
                segments={[
                  { value: countDelivered, color: "#16a34a" },
                  { value: countShipped, color: "#2563eb" },
                  { value: countPaid, color: "#f59e0b" },
                  { value: countPending, color: "#dc2626" },
                ]}
              />
              <div style={{ display: "flex", justifyContent: "center", gap: 12, fontSize: "0.75rem", flexWrap: "wrap" }}>
                <span>🟢 Livrées ({countDelivered})</span>
                <span>🔵 Expédiées ({countShipped})</span>
                <span>🟠 Payées ({countPaid})</span>
                <span>🔴 En attente ({countPending})</span>
              </div>
            </>
          ) : (
            <div className="va-empty">
              <div style={{ fontSize: "2rem" }}>🍩</div>
              <p>Aucune commande pour l'instant.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}