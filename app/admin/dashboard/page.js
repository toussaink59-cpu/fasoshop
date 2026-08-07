"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminBottomNav from "@/app/components/AdminBottomNav";
import KimoxaLogo from "@/app/components/KimoxaLogo";

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
    if (sponsorRes.ok) {
      const d = await shopsRes.json && await sponsorRes.json();
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
      <div className="topbar">
        <div className="brand">
          <KimoxaLogo light size={22} /> <span className="role-tag">Admin</span>
        </div>
        <div className="topbar-actions">
          <Link href="/admin/analytics"><button>Analytics</button></Link>
          <button onClick={handleLogout}>Déconnexion</button>
        </div>
      </div>
      <div className="woven-strip" />

      <div className="vendor-dashboard-wrap">
        <div className="vendor-dashboard-header">
          <h1>Tableau de bord admin</h1>
          <p>{user ? `Connecté en tant que ${user.full_name}` : ""}</p>
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
