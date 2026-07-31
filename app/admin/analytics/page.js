"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function Sparkline({ data, valueKey }) {
  const width = 900;
  const height = 110;
  const max = Math.max(...data.map((d) => d[valueKey]), 1);
  const stepX = width / (data.length - 1 || 1);

  const points = data.map((d, i) => {
    const x = i * stepX;
    const y = height - (d[valueKey] / max) * (height - 12) - 6;
    return `${x},${y}`;
  });

  const areaPoints = `0,${height} ${points.join(" ")} ${width},${height}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: 110, display: "block" }}>
      <polygon points={areaPoints} fill="var(--orange-100)" />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="var(--orange-500)"
        strokeWidth="2.5"
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
                background: "var(--orange-500)",
                borderRadius: 4,
              }}
            />
          </div>
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
  const [chartMode, setChartMode] = useState("range"); // "range" | "year"
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

  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand">
          🛒 FasoShop <span className="role-tag">Admin</span>
        </div>
        <div className="topbar-actions">
          <Link href="/admin/dashboard"><button>Tableau de bord</button></Link>
          <button onClick={handleLogout}>Déconnexion</button>
        </div>
      </div>
      <div className="woven-strip" />

      <div className="content">
        <div className="page-header">
          <h1>Analytics</h1>
          <p>{user ? `Connecté en tant que ${user.full_name}` : ""}</p>
        </div>

        {loading ? (
          <p>Chargement...</p>
        ) : (
          <>
            <div className="panel">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <h2 style={{ marginBottom: 0 }}>Ventes dans le temps</h2>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {[1, 7, 30].map((d) => (
                    <button
                      key={d}
                      className={`btn ${chartMode === "range" && rangeDays === d ? "btn-primary" : "btn-ghost"}`}
                      onClick={() => {
                        setChartMode("range");
                        setRangeDays(d);
                      }}
                    >
                      {d}J
                    </button>
                  ))}
                  <select
                    value={chartMode === "year" ? selectedYear : ""}
                    onChange={(e) => {
                      setSelectedYear(Number(e.target.value));
                      setChartMode("year");
                    }}
                    style={{ width: "auto" }}
                  >
                    <option value="" disabled>Choisir une année</option>
                    {(data.availableYears || [new Date().getFullYear()]).map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
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
            </div>

            <div className="panel">
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

            <div className="panel">
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

            <div className="panel">
              <h2>Top produits</h2>
              {data.topProducts.length === 0 ? (
                <p style={{ color: "var(--ink-400)" }}>Aucune donnée pour l'instant.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Produit</th>
                      <th>Boutique</th>
                      <th>Unités vendues</th>
                      <th>Revenu généré</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topProducts.map((p, i) => (
                      <tr key={i}>
                        <td>{p.product_name}</td>
                        <td>{p.shop_name}</td>
                        <td>{p.units_sold}</td>
                        <td>{Number(p.revenue).toLocaleString("fr-FR")} FCFA</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
