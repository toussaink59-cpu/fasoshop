"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminBottomNav from "@/app/components/AdminBottomNav";
import KimoxaLogo from "@/app/components/KimoxaLogo";
import AdminAnalytics from "@/app/components/AdminAnalytics";
import AdminInsights from "@/app/components/AdminInsights";
const ORDER_STATUS = {
  pending: { label: "En attente", cls: "status-pending" },
  paid: { label: "Payée", cls: "status-paid" },
  preparation: { label: "En préparation", cls: "status-preparation" },
  shipped: { label: "Expédiée", cls: "status-shipped" },
  delivered: { label: "Livrée", cls: "status-delivered" },
  cancelled: { label: "Annulée", cls: "status-cancelled" },
};

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [orderStats, setOrderStats] = useState(null);
  const [pendingShopsCount, setPendingShopsCount] = useState(0);
  const [pendingModerationCount, setPendingModerationCount] = useState(0);
  const [orderFilter, setOrderFilter] = useState("all");
  const [earnings, setEarnings] = useState(null);
  const [cockpitData, setCockpitData] = useState(null);

  const loadOrders = useCallback(async () => {
    const res = await fetch("/api/admin/orders");
    if (res.status === 401 || res.status === 403) {
      router.push("/login");
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders || []);
      setOrderStats(data.stats || null);
    }
    setLoading(false);
  }, [router]);

  const loadBadgeCounts = useCallback(async () => {
    const [shopsRes, sponsorRes] = await Promise.all([
      fetch("/api/admin/shops"),
      fetch("/api/admin/sponsorships"),
    ]);
    if (shopsRes.ok) {
      const d = await shopsRes.json();
      setPendingShopsCount((d.shops || []).filter((s) => s.status === "pending").length);
    }
    // BUG CORRIGÉ : on lit bien sponsorRes (et non shopsRes une 2e fois)
    if (sponsorRes.ok) {
      const d = await sponsorRes.json();
      setPendingModerationCount((d.requests || []).filter((s) => s.status === "pending").length);
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.user || data.user.role !== "admin") {
          router.push("/login");
          return;
        }
        setUser(data.user);
        loadOrders();
        loadBadgeCounts();
        fetch("/api/admin/earnings").then((r) => r.json()).then((d) => setEarnings(d.earnings || null));
      fetch("/api/admin/dashboard").then((r) => r.json()).then((d) => setCockpitData(d));
      });
  }, [loadOrders, loadBadgeCounts, router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const filteredOrders = orderFilter === "all" ? orders : orders.filter((o) => o.status === orderFilter);
  const countBy = (s) => orders.filter((o) => o.status === s).length;

  return (
    <div className="shell">
      {/* ===== TOPBAR TEMU ===== */}
      <div className="topbar">
        <div className="brand">
          <KimoxaLogo light size={20} /> <span className="role-tag">Admin</span>
        </div>
        <div className="topbar-actions">
          <Link href="/admin/analytics" className="topbar-textlink">Analytics</Link>
          <button className="topbar-logout" onClick={handleLogout}>Déconnexion</button>
        </div>
      </div>
      <div className="woven-strip" />

      <div className="vendor-dashboard-wrap">
        <div className="vendor-dashboard-header">
          <h1>Tableau de bord admin</h1>
          <p>{user ? `Connecté en tant que ${user.full_name}` : ""}</p>
        </div>


      {/* 🎯 COCKPIT ADMIN — KPIs + Alertes + Actions rapides */}
      {cockpitData && (
        <div style={{ display: "grid", gap: 16, marginBottom: 24 }}>
          {/* KPIs enrichis avec deltas */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <div className="vendor-stat-card">
              <div className="vendor-stat-icon">💰</div>
              <div className="vendor-stat-value" style={{ fontSize: "1.4rem" }}>
                {cockpitData.revenue.today.toLocaleString("fr-FR")} FCFA
              </div>
              <div className="vendor-stat-label">CA aujourd'hui</div>
            </div>
            <div className="vendor-stat-card">
              <div className="vendor-stat-icon">📈</div>
              <div className="vendor-stat-value" style={{ fontSize: "1.2rem" }}>
                {cockpitData.revenue.week.toLocaleString("fr-FR")} FCFA
              </div>
              <div className="vendor-stat-label">
                CA semaine{" "}
                <span style={{ color: cockpitData.revenue.week_delta >= 0 ? "#2e7d32" : "#c62828", fontSize: "0.9rem" }}>
                  {cockpitData.revenue.week_delta >= 0 ? "+" : ""}{cockpitData.revenue.week_delta}%
                </span>
              </div>
            </div>
            <div className="vendor-stat-card">
              <div className="vendor-stat-icon">🗓️</div>
              <div className="vendor-stat-value" style={{ fontSize: "1.2rem" }}>
                {cockpitData.revenue.month.toLocaleString("fr-FR")} FCFA
              </div>
              <div className="vendor-stat-label">
                CA mois{" "}
                <span style={{ color: cockpitData.revenue.month_delta >= 0 ? "#2e7d32" : "#c62828", fontSize: "0.9rem" }}>
                  {cockpitData.revenue.month_delta >= 0 ? "+" : ""}{cockpitData.revenue.month_delta}%
                </span>
              </div>
            </div>
            <div className="vendor-stat-card">
              <div className="vendor-stat-icon">🛒</div>
              <div className="vendor-stat-value" style={{ fontSize: "1.2rem" }}>
                {cockpitData.avgBasket.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} FCFA
              </div>
              <div className="vendor-stat-label">Panier moyen (30j)</div>
            </div>
            <div className="vendor-stat-card">
              <div className="vendor-stat-icon">👥</div>
              <div className="vendor-stat-value">{cockpitData.customers.week}</div>
              <div className="vendor-stat-label">Nouveaux clients (7j)</div>
            </div>
          </div>

          {/* Alertes proactives */}
          {(cockpitData.alerts.lowStock > 0 || cockpitData.alerts.stagnantOrders > 0) && (
            <div className="va-card" style={{ background: "#fff3cd", borderLeft: "4px solid #ffc107" }}>
              <h3 style={{ margin: "0 0 12px 0", fontSize: "1.1rem" }}>⚠️ Alertes</h3>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {cockpitData.alerts.lowStock > 0 && (
                  <Link href="/admin/products" style={{ color: "#856404", textDecoration: "none" }}>
                    📦 <strong>{cockpitData.alerts.lowStock} produit(s)</strong> bientôt en rupture
                  </Link>
                )}
                {cockpitData.alerts.stagnantOrders > 0 && (
                  <Link href="/admin/orders?filter=stagnant" style={{ color: "#856404", textDecoration: "none" }}>
                    ⏳ <strong>{cockpitData.alerts.stagnantOrders} commande(s)</strong> stagnent depuis &gt; 3 jours
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Actions rapides + Top 3 vendeurs */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="va-card">
              <h3 style={{ margin: "0 0 12px 0", fontSize: "1.1rem" }}>🚀 Actions rapides</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {cockpitData.payouts.released_count > 0 && (
                  <Link href="/admin/payouts" className="btn btn-primary" style={{ textDecoration: "none" }}>
                    💸 Valider {cockpitData.payouts.released_count} payout(s) ({cockpitData.payouts.released_amount.toLocaleString("fr-FR")} FCFA)
                  </Link>
                )}
                {pendingShopsCount > 0 && (
                  <Link href="/admin/shops" className="btn btn-ghost" style={{ textDecoration: "none" }}>
                    🏪 Vérifier {pendingShopsCount} boutique(s) en attente
                  </Link>
                )}
                {pendingModerationCount > 0 && (
                  <Link href="/admin/moderation" className="btn btn-ghost" style={{ textDecoration: "none" }}>
                    🛡️ Traiter {pendingModerationCount} demande(s) de modération
                  </Link>
                )}
              </div>
            </div>

            <div className="va-card">
              <h3 style={{ margin: "0 0 12px 0", fontSize: "1.1rem" }}>🏆 Top 3 vendeurs (mois)</h3>
              {cockpitData.topVendors.length === 0 ? (
                <p style={{ color: "#666", fontSize: "0.9rem" }}>Aucune vente ce mois</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {cockpitData.topVendors.map((v, i) => (
                    <div key={v.shop_name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <strong>{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"} {v.shop_name}</strong>
                        <div style={{ fontSize: "0.85rem", color: "#666" }}>
                          {v.order_count} commande(s)
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: "bold", color: "#d4af37" }}>
                          {v.revenue.toLocaleString("fr-FR")} FCFA
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

                       {/* 📊 Analytics plateforme (données réelles + états vides) */}
        <AdminAnalytics />

        {/* 💸🏆⏳ Payouts + top vendeurs + boutiques en attente */}
        <AdminInsights />

        {/* 📤 Exports CSV (compta / gestion) */}
        <div className="va-card" style={{ marginTop: 12 }}>
          <h3>📤 Exports CSV (Excel)</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a className="btn btn-ghost" href="/api/admin/export?kind=orders">🛒 Commandes</a>
            <a className="btn btn-ghost" href="/api/admin/export?kind=shops">🏪 Boutiques</a>
            <a className="btn btn-ghost" href="/api/admin/export?kind=payouts">💸 Payouts</a>
          </div>
        </div>
        {/* 4 cartes stats */}
        <div className="vendor-stats-grid">
          <div className="vendor-stat-card">
            <div className="vendor-stat-icon">🛒</div>
            <div className="vendor-stat-value">{orderStats ? orderStats.orders_today : "—"}</div>
            <div className="vendor-stat-label">Commandes aujourd'hui</div>
          </div>
          <div className="vendor-stat-card">
            <div className="vendor-stat-icon">💰</div>
            <div className="vendor-stat-value" style={{ fontSize: "1.2rem" }}>
              {orderStats ? `${Number(orderStats.revenue_today).toLocaleString("fr-FR")}` : "—"}
            </div>
            <div className="vendor-stat-label">FCFA aujourd'hui</div>
          </div>
          <div className="vendor-stat-card">
            <div className="vendor-stat-icon">📦</div>
            <div className="vendor-stat-value">{orderStats ? orderStats.orders_total : "—"}</div>
            <div className="vendor-stat-label">Commandes totales</div>
          </div>
          <div className="vendor-stat-card">
            <div className="vendor-stat-icon">⏳</div>
            <div className="vendor-stat-value" style={{ color: orderStats?.orders_awaiting > 0 ? "var(--gold-600)" : "inherit" }}>
              {orderStats ? orderStats.orders_awaiting : "—"}
            </div>
            <div className="vendor-stat-label">À préparer</div>
          </div>
        </div>

        {/* Liens rapides avec badges */}
        <div className="vendor-quick-links">
          <Link href="/admin/shops" className="vendor-quick-link">
            🏪 <strong>Boutiques</strong>
            <span>{pendingShopsCount > 0 ? `${pendingShopsCount} en attente de vérification` : "Gestion et vérification"}</span>
          </Link>
          <Link href="/admin/moderation" className="vendor-quick-link">
            🛡️ <strong>Modération</strong>
            <span>{pendingModerationCount > 0 ? `${pendingModerationCount} demande(s) en attente` : "Avis clients et sponsoring"}</span>
          </Link>
          <Link href="/admin/products" className="vendor-quick-link">
            📦 <strong>Produits</strong>
            <span>Stock détaillé par boutique</span>
          </Link>
          <Link href="/admin/analytics" className="vendor-quick-link">
            📈 <strong>Analytics</strong>
            <span>Statistiques détaillées</span>
          </Link>
          <Link href="/admin/payouts" className="vendor-quick-link">
            💸 <strong>Payouts</strong>
            <span>{earnings ? `${earnings.released_count} payout(s) à libérer` : "Gestion des retraits vendeur"}</span>
          </Link>
          <Link href="/admin/conversations" className="vendor-quick-link">
            💬 <strong>Conversations</strong>
            <span>Surveillance vendeur ↔ client</span>
          </Link>
        </div>

        {/* Onglets de filtrage des commandes */}
        <div className="vendor-filters">
          <button className={`vendor-filter-btn ${orderFilter === "all" ? "active" : ""}`} onClick={() => setOrderFilter("all")}>
            Toutes ({orders.length})
          </button>
          <button className={`vendor-filter-btn ${orderFilter === "pending" ? "active" : ""}`} onClick={() => setOrderFilter("pending")}>
            En attente ({countBy("pending")})
          </button>
          <button className={`vendor-filter-btn ${orderFilter === "shipped" ? "active" : ""}`} onClick={() => setOrderFilter("shipped")}>
            Expédiées ({countBy("shipped")})
          </button>
          <button className={`vendor-filter-btn ${orderFilter === "delivered" ? "active" : ""}`} onClick={() => setOrderFilter("delivered")}>
            Livrées ({countBy("delivered")})
          </button>
          <button className={`vendor-filter-btn ${orderFilter === "cancelled" ? "active" : ""}`} onClick={() => setOrderFilter("cancelled")}>
            Annulées ({countBy("cancelled")})
          </button>
        </div>

        {/* Ventes récentes en cartes */}
        <div className="vendor-products-section">
          <h2>Ventes récentes ({filteredOrders.length})</h2>

          {loading ? (
            <p>Chargement...</p>
          ) : filteredOrders.length === 0 ? (
            <div className="empty-state">
              <div className="glyph">🛒</div>
              <p>Aucune commande {orderFilter !== "all" ? "pour ce filtre" : "pour l'instant"}.</p>
            </div>
          ) : (
            filteredOrders.map((o) => {
              const st = ORDER_STATUS[o.status] || { label: o.status, cls: "status-pending" };
              return (
                <div className="order-card" key={o.id}>
                  <div className="order-head">
                    <div>
                      <strong className="order-number">Commande #{o.id}</strong>
                      <span className="order-date">
                        {new Date(o.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <span className="order-total">{Number(o.total_amount).toLocaleString("fr-FR")} FCFA</span>
                  </div>
                  <div className="order-meta">
                    👤 {o.buyer_name} · {o.buyer_email} · 🏪 {o.shop_count} boutique{o.shop_count > 1 ? "s" : ""}
                  </div>
                  <span className={`status-pill ${st.cls}`}>{st.label}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
      <AdminBottomNav pendingShopsCount={pendingShopsCount} pendingModerationCount={pendingModerationCount} />
    </div>
  );
}
