"use client";

import { useEffect, useState } from "react";

const fmt = (n) => Number(n || 0).toLocaleString("fr-FR");

// Graphique en aire SVG (zéro lib externe)
function AreaChart({ series }) {
  const W = 600, H = 190, P = 26;
  const values = series.map((s) => Number(s.gross) || 0);
  const max = Math.max(...values, 1);
  const stepX = series.length > 1 ? (W - P * 2) / (series.length - 1) : 0;
  const pts = values.map((v, i) => [P + i * stepX, H - P - (v / max) * (H - P * 2)]);
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${(P + (series.length - 1) * stepX).toFixed(1)},${H - P} L${P},${H - P} Z`;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }} role="img" aria-label="Évolution du chiffre d'affaires sur 7 jours">
        <path d={area} fill="rgba(230,166,35,0.14)" />
        <path d={line} fill="none" stroke="#e6a623" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="4" fill="#e6a623" stroke="#fff" strokeWidth="1.5" />
        ))}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--ink-400,#888)", padding: "0 8px" }}>
        {series.map((s) => (
          <span key={s.date}>{new Date(s.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}</span>
        ))}
      </div>
    </div>
  );
}

// Donut SVG 3 segments
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

export default function VendorAnalytics() {
  // États initiaux = structure SSR (valeurs 0) -> pas de mismatch
  const [earnings, setEarnings] = useState(null);
  const [series, setSeries] = useState([]);
  const [items, setItems] = useState([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/vendor/earnings").then((r) => r.json()).catch(() => ({})),
      fetch("/api/vendor/earnings/series?days=7").then((r) => r.json()).catch(() => ({})),
      fetch("/api/vendor/orders").then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
    ]).then(([e, s, o]) => {
      setEarnings(e.earnings || null);
      setSeries(s.series || []);
      setItems(o.items || []);
    });
  }, []);

  const totalGross = Number(earnings?.total_gross || 0);
  const totalCommission = Number(earnings?.total_commission || 0);
  const held = Number(earnings?.held_amount || 0);
  const released = Number(earnings?.released_amount || 0);
  const paid = Number(earnings?.paid_amount || 0);

  const byOrder = new Map();
  for (const it of items) {
    if (!byOrder.has(it.order_id)) byOrder.set(it.order_id, it.delivery_status);
  }
  const statuses = [...byOrder.values()];
  const countPrep = statuses.filter((s) => s === "preparation").length;
  const countShip = statuses.filter((s) => s === "shipped").length;
  const countDel = statuses.filter((s) => s === "delivered").length;
  const totalOrders = statuses.length;

  // Vérifie s'il y a des ventes sur les 7 derniers jours
  const hasRecentSales = series.some((s) => s.gross > 0);

  const kpis = [
    { icon: "🛒", label: "Commandes reçues", value: fmt(totalOrders) },
    { icon: "✅", label: "Livrées", value: fmt(countDel) },
    { icon: "🚚", label: "En livraison", value: fmt(countShip) },
    { icon: "💰", label: "Chiffre d'affaires", value: `${fmt(totalGross)} FCFA` },
    { icon: "📊", label: "Commissions (9%)", value: `${fmt(totalCommission)} FCFA` },
    { icon: "💳", label: "Solde disponible", value: `${fmt(released)} FCFA` },
  ];

  return (
    <section className="va-section">
      {/* 6 cartes KPI - toujours rendu (SSR = client) */}
      <div className="va-kpi-grid">
        {kpis.map((k) => (
          <div className="va-kpi" key={k.label}>
            <div className="icon" aria-hidden="true">{k.icon}</div>
            <div className="value">{k.value}</div>
            <div className="label">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Résumé escrow - toujours rendu */}
      <div className="va-card va-escrow-row">
        <span>🔒 Séquestrés : <strong>{fmt(held)} FCFA</strong></span>
        <span>✅ À retirer : <strong>{fmt(released)} FCFA</strong></span>
        <span>💸 Déjà payés : <strong>{fmt(paid)} FCFA</strong></span>
      </div>

      <div className="va-row">
        {/* Courbe CA */}
        <div className="va-card">
          <h3>📈 Évolution du chiffre d'affaires (7 jours)</h3>
          {hasRecentSales ? (
            <AreaChart series={series} />
          ) : (
            <div className="va-empty">
              <div style={{ fontSize: "2rem" }}>📈</div>
              <p>Aucune vente sur les 7 derniers jours.</p>
              <p style={{ fontSize: "0.75rem", marginTop: 4 }}>Vos ventes récentes apparaîtront ici.</p>
            </div>
          )}
        </div>

        {/* Donut répartition */}
        <div className="va-card va-center">
          <h3>🍩 Répartition des commandes</h3>
          {totalOrders > 0 ? (
            <>
              <Donut
                total={totalOrders}
                segments={[
                  { value: countDel, color: "#16a34a" },
                  { value: countShip, color: "#2563eb" },
                  { value: countPrep, color: "#f59e0b" },
                ]}
              />
              <div className="va-legend">
                <span>🟢 Livrées ({countDel})</span>
                <span>🔵 En livraison ({countShip})</span>
                <span>🟠 En attente ({countPrep})</span>
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