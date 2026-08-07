"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminBottomNav from "@/app/components/AdminBottomNav";
import KimoxaLogo from "@/app/components/KimoxaLogo";

function Sparkline({ data, valueKey }) {
  const width = 900;
  const height = 140;
  const max = Math.max(...data.map((d) => d[valueKey]), 1);
  const stepX = width / (data.length - 1 || 1);

  const points = data.map((d, i) => {
    const x = i * stepX;
    const y = height - (d[valueKey] / max) * (height - 16) - 8;
    return `${x},${y}`;
  });

  const areaPoints = `0,${height} ${points.join(" ")} ${width},${height}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: 140, display: "block" }}>
      <polygon points={areaPoints} fill="rgba(212, 175, 55, 0.15)" />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="var(--gold-600, #d97706)"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BarList({ items, labelKey, valueKey, secondaryKey, formatValue }) {
  const max = Math.max(...items.map((i) => i[valueKey]), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {items.map((item, i) => (
        <div key={i}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: 4 }}>
            <span style={{ fontWeight: 600 }}>
              {item[labelKey]}
              {secondaryKey && <span style={{ color: "var(--ink-400)", fontWeight: 400 }}> — {item[secondaryKey]}</span>}
            </span>
            <span>{formatValue ? formatValue(item[valueKey]) : item[valueKey]}</span>
          </div>
          <div style={{ height: 8, background: "var(--sand-100)", borderRadius: 4, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${(item[valueKey] / max) * 100}%`,
                background: "var(--gold-600, #d97706)",
                borderRadius: 4,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function RankList({ items }) {
  return (
    <div className="ana-rank-list">
      {items.map((p, i) => (
        <div className="ana-rank-item" key={i}>
          <span className={`ana-rank-num ${i < 3 ? "ana-rank-top" : ""}`}>{i + 1}</span>
          <div className="ana-rank-text">
            <strong>{p.product_name}</strong>
            <span>
              {p.shop_name} · {p.units_sold} unité{p.units_sold > 1 ? "s" : ""} vendue{p.units_sold > 1 ? "s" : ""}
            </span>
          </div>
          <span className="ana-rank-value">{Number(p.revenue).toLocaleString("fr-FR")} FCFA</span>
        </div>
      ))}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartMode, setChartMode] = useState("range");
  const [rangeDays, setRangeDays] = useState(30);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [series, setSeries] = useState(null);
  const [seriesLoading, setSeriesLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user || d.user.role !== "admin") {
          router.push("/login");
          return;
        }
        setUser(d.user);
        fetch("/api/admin/analytics")
          .then((r) => r.json())
          .then((analytics) => {
            setData(analytics);
            if (analytics.availableYears?.length) {
              setSelectedYear(analytics.availableYears[0]);
            }
            setLoading(false);
          });
      });
  }, [router]);

  useEffect(() => {
    setSeriesLoading(true);
    const params =
      chartMode === "year"
        ? `mode=year&year=${selectedYear}`
        : `mode=range&days=${rangeDays}`;
    fetch(`/api/admin/analytics/series?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setSeries(d.series);
        setSeriesLoading(false);
      });
  }, [chartMode, rangeDays, selectedYear]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const totalGross = series ? series.reduce((s, d) => s + Number(d.gross || 0), 0) : 0;
  const bestDay =
    series && series.length
      ? series.reduce((a, b) => (Number(b.gross || 0) > Number(a.gross || 0) ? b : a))
      : null;
  const topCat = data?.salesByCategory?.[0];
  const topVendor = data?.salesByVendor?.[0];

  return (
    <div className="shell">
      {/* ===== TOPBAR TEMU ===== */}
      <div className="topbar">
        <div className="brand">
          <KimoxaLogo light size={20} /> <span className="role-tag">Admin</span>
        </div>
        <div className="topbar-actions">
          <Link href="/admin/dashboard" className="topbar-textlink">Tableau de bord</Link>
          <button className="topbar-logout" onClick={handleLogout}>Déconnexion</button>
        </div>
      </div>
      <div className="woven-strip" />

      <div className="vendor-dashboard-wrap">
        <div className="vendor-dashboard-header">
          <h1>Analytics</h1>
          <p>{user ? `Connecté en tant que ${user.full_name}` : ""}</p>
        </div>

        {loading ? (
          <p>Chargement...</p>
        ) : (
          <>
            {/* Sélecteur de période professionnel */}
            <div className="ana-period">
              <div className="vendor-filters">
                <button
                  className={`vendor-filter-btn ${chartMode === "range" && rangeDays === 1 ? "active" : ""}`}
                  onClick={() => { setChartMode("range"); setRangeDays(1); }}
                >
                  Aujourd'hui
                </button>
                <button
                  className={`vendor-filter-btn ${chartMode === "range" && rangeDays === 7 ? "active" : ""}`}
                  onClick={() => { setChartMode("range"); setRangeDays(7); }}
                >
                  7 derniers jours
                </button>
                <button
                  className={`vendor-filter-btn ${chartMode === "range" && rangeDays === 30 ? "active" : ""}`}
                  onClick={() => { setChartMode("range"); setRangeDays(30); }}
                >
                  30 derniers jours
                </button>
                <button
                  className={`vendor-filter-btn ${chartMode === "range" && rangeDays === 90 ? "active" : ""}`}
                  onClick={() => { setChartMode("range"); setRangeDays(90); }}
                >
                  90 derniers jours
                </button>
                <button
                  className={`vendor-filter-btn ${chartMode === "year" && selectedYear === new Date().getFullYear() ? "active" : ""}`}
                  onClick={() => { setChartMode("year"); setSelectedYear(new Date().getFullYear()); }}
                >
                  Cette année
                </button>
                <select
                  className="vendor-filter-select"
                  value={chartMode === "year" ? selectedYear : ""}
                  onChange={(e) => {
                    setSelectedYear(Number(e.target.value));
                    setChartMode("year");
                  }}
                >
                  <option value="" disabled>Autres années…</option>
                  {(data.availableYears || [new Date().getFullYear()]).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {!seriesLoading && series && series.length > 0 && (
                <p className="ana-period-hint">
                  📅 Du {series[0]?.label} au {series[series.length - 1]?.label}
                </p>
              )}
            </div>

            {/* 4 KPI cards */}
            <div className="vendor-stats-grid">
              <div className="vendor-stat-card">
                <div className="vendor-stat-icon">💰</div>
                <div className="vendor-stat-value" style={{ fontSize: "1.15rem" }}>
                  {totalGross.toLocaleString("fr-FR")}
                </div>
                <div className="vendor-stat-label">FCFA sur la période</div>
              </div>
              <div className="vendor-stat-card">
                <div className="vendor-stat-icon">📈</div>
                <div className="vendor-stat-value" style={{ fontSize: "1.15rem" }}>
                  {bestDay ? Number(bestDay.gross).toLocaleString("fr-FR") : "—"}
                </div>
                <div className="vendor-stat-label">Meilleur jour ({bestDay?.label || "—"})</div>
              </div>
              <div className="vendor-stat-card">
                <div className="vendor-stat-icon">🏆</div>
                <div className="vendor-stat-value" style={{ fontSize: "0.95rem" }}>
                  {topCat ? topCat.category_name : "—"}
                </div>
                <div className="vendor-stat-label">Top catégorie</div>
              </div>
              <div className="vendor-stat-card">
                <div className="vendor-stat-icon">🥇</div>
                <div className="vendor-stat-value" style={{ fontSize: "0.95rem" }}>
                  {topVendor ? topVendor.shop_name : "—"}
                </div>
                <div className="vendor-stat-label">Top vendeur</div>
              </div>
            </div>

            {/* Grand graphique */}
            <div className="ana-chart-card">
              <h2>Ventes dans le temps</h2>
              {seriesLoading ? (
                <p style={{ color: "var(--ink-400)" }}>Chargement...</p>
              ) : series && series.some((d) => d.gross > 0) ? (
                <>
                  <Sparkline data={series} valueKey="gross" />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--ink-400)", marginTop: 4 }}>
                    <span>{series[0]?.label}</span>
                    <span>{series[Math.floor(series.length / 2)]?.label}</span>
                    <span>{series[series.length - 1]?.label}</span>
                  </div>
                </>
              ) : (
                <p style={{ color: "var(--ink-400)" }}>Aucune vente sur cette période.</p>
              )}
            </div>

            {/* Deux colonnes : catégories + vendeurs */}
            <div className="ana-two-col">
              <div className="ana-panel">
                <h2>Ventes par catégorie</h2>
                {data.salesByCategory.length === 0 ? (
                  <p style={{ color: "var(--ink-400)" }}>Aucune donnée pour l'instant.</p>
                ) : (
                  <BarList
                    items={data.salesByCategory}
                    labelKey="category_name"
                    valueKey="revenue"
                    formatValue={(v) => `${Number(v).toLocaleString("fr-FR")} FCFA`}
                  />
                )}
              </div>

              <div className="ana-panel">
                <h2>Ventes par vendeur</h2>
                {data.salesByVendor.length === 0 ? (
                  <p style={{ color: "var(--ink-400)" }}>Aucune donnée pour l'instant.</p>
                ) : (
                  <BarList
                    items={data.salesByVendor}
                    labelKey="shop_name"
                    secondaryKey="vendor_name"
                    valueKey="revenue"
                    formatValue={(v) => `${Number(v).toLocaleString("fr-FR")} FCFA`}
                  />
                )}
              </div>
            </div>

            {/* Top produits en classement */}
            <div className="ana-panel">
              <h2>🏅 Top produits</h2>
              {data.topProducts.length === 0 ? (
                <p style={{ color: "var(--ink-400)" }}>Aucune donnée pour l'instant.</p>
              ) : (
                <RankList items={data.topProducts} />
              )}
            </div>
          </>
        )}
      </div>
      <AdminBottomNav />
    </div>
  );
}
