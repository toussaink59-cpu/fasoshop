"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminBottomNav from "@/app/components/AdminBottomNav";
import KimoxaLogo from "@/app/components/KimoxaLogo";
import AdminAnalytics from "@/app/components/AdminAnalytics";
import AdminInsights from "@/app/components/AdminInsights";
import {
  WalletIcon, BarChartIcon, ClockIcon, ShoppingCartIcon, UserPlusIcon,
  AlertTriangleIcon, PackageIcon, CreditCardIcon, StoreIcon, ShieldCheckIcon,
  BadgeCheckIcon, UploadIcon, MessageIcon, UserIcon,
} from "@/app/components/Icons";

const ZapIcon = ({ size = 20, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const MedalBadge = ({ rank }) => {
  const colors = { 1: "#ffd700", 2: "#c0c0c0", 3: "#cd7f32" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 24, height: 24, borderRadius: "50%", background: colors[rank] || "#999",
      color: "#fff", fontWeight: 700, fontSize: "0.85rem", marginRight: 8, flexShrink: 0,
    }}>
      {rank}
    </span>
  );
};

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

        {cockpitData && (
          <div style={{ display: "grid", gap: 16, marginBottom: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <div className="vendor-stat-card">
                <div className="vendor-stat-icon" style={{ color: "var(--gold-600)" }}><WalletIcon size={28} /></div>
                <div className="vendor-stat-value" style={{ fontSize: "1.4rem" }}>
                  {cockpitData.revenue.today.toLocaleString("fr-FR")} FCFA
                </div>
                <div className="vendor-stat-label">CA aujourd'hui</div>
              </div>
              <div className="vendor-stat-card">
                <div className="vendor-stat-icon" style={{ color: "var(--gold-600)" }}><BarChartIcon size={28} /></div>
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
                <div className="vendor-stat-icon" style={{ color: "var(--gold-600)" }}><ClockIcon size={28} /></div>
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
                <div className="vendor-stat-icon" style={{ color: "var(--gold-600)" }}><ShoppingCartIcon size={28} /></div>
                <div className="vendor-stat-value" style={{ fontSize: "1.2rem" }}>
                  {cockpitData.avgBasket.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} FCFA
                </div>
                <div className="vendor-stat-label">Panier moyen (30j)</div>
              </div>
              <div className="vendor-stat-card">
                <div className="vendor-stat-icon" style={{ color: "var(--gold-600)" }}><UserPlusIcon size={28} /></div>
                <div className="vendor-stat-value">{cockpitData.customers.week}</div>
                <div className="vendor-stat-label">Nouveaux clients (7j)</div>
              </div>
            </div>

            {(cockpitData.alerts.lowStock > 0 || cockpitData.alerts.stagnantOrders > 0) && (
              <div className="va-card" style={{ background: "#fff3cd", borderLeft: "4px solid #ffc107" }}>
                <h3 style={{ margin: "0 0 12px 0", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: 8 }}>
                  <AlertTriangleIcon size={18} /> Alertes
                </h3>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  {cockpitData.alerts.lowStock > 0 && (
                    <Link href="/admin/products" style={{ color: "#856404", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
                      <PackageIcon size={16} /> <strong>{cockpitData.alerts.lowStock} produit(s)</strong> bientôt en rupture
                    </Link>
                  )}
                  {cockpitData.alerts.stagnantOrders > 0 && (
                    <Link href="/admin/orders?filter=stagnant" style={{ color: "#856404", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
                      <ClockIcon size={16} /> <strong>{cockpitData.alerts.stagnantOrders} commande(s)</strong> stagnent depuis &gt; 3 jours
                    </Link>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="va-card">
                <h3 style={{ margin: "0 0 12px 0", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: 8 }}>
                  <ZapIcon size={18} /> Actions rapides
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {cockpitData.payouts.released_count > 0 && (
                    <Link href="/admin/payouts" className="btn btn-primary" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
                      <CreditCardIcon size={16} /> Valider {cockpitData.payouts.released_count} payout(s) ({cockpitData.payouts.released_amount.toLocaleString("fr-FR")} FCFA)
                    </Link>
                  )}
                  {pendingShopsCount > 0 && (
                    <Link href="/admin/shops" className="btn btn-ghost" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
                      <StoreIcon size={16} /> Vérifier {pendingShopsCount} boutique(s) en attente
                    </Link>
                  )}
                  {pendingModerationCount > 0 && (
                    <Link href="/admin/moderation" className="btn btn-ghost" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
                      <ShieldCheckIcon size={16} /> Traiter {pendingModerationCount} demande(s) de modération
                    </Link>
                  )}
                </div>
              </div>

              <div className="va-card">
                <h3 style={{ margin: "0 0 12px 0", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: 8 }}>
                  <BadgeCheckIcon size={18} /> Top 3 vendeurs (mois)
                </h3>
                {cockpitData.topVendors.length === 0 ? (
                  <p style={{ color: "#666", fontSize: "0.9rem" }}>Aucune vente ce mois</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {cockpitData.topVendors.map((v, i) => (
                      <div key={v.shop_name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <MedalBadge rank={i + 1} />
                          <div>
                            <strong>{v.shop_name}</strong>
                            <div style={{ fontSize: "0.85rem", color: "#666" }}>
                              {v.order_count} commande(s)
                            </div>
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

        <AdminAnalytics />
        <AdminInsights />

        <div className="va-card" style={{ marginTop: 12 }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <UploadIcon size={18} /> Exports CSV (Excel)
          </h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a className="btn btn-ghost" href="/api/admin/export?kind=orders" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <ShoppingCartIcon size={14} /> Commandes
            </a>
            <a className="btn btn-ghost" href="/api/admin/export?kind=shops" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <StoreIcon size={14} /> Boutiques
            </a>
            <a className="btn btn-ghost" href="/api/admin/export?kind=payouts" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <CreditCardIcon size={14} /> Payouts
            </a>
          </div>
        </div>

        <div className="vendor-stats-grid">
          <div className="vendor-stat-card">
            <div className="vendor-stat-icon" style={{ color: "var(--gold-600)" }}><ShoppingCartIcon size={28} /></div>
            <div className="vendor-stat-value">{orderStats ? orderStats.orders_today : "—"}</div>
            <div className="vendor-stat-label">Commandes aujourd'hui</div>
          </div>
          <div className="vendor-stat-card">
            <div className="vendor-stat-icon" style={{ color: "var(--gold-600)" }}><WalletIcon size={28} /></div>
            <div className="vendor-stat-value" style={{ fontSize: "1.2rem" }}>
              {orderStats ? `${Number(orderStats.revenue_today).toLocaleString("fr-FR")}` : "—"}
            </div>
            <div className="vendor-stat-label">FCFA aujourd'hui</div>
          </div>
          <div className="vendor-stat-card">
            <div className="vendor-stat-icon" style={{ color: "var(--gold-600)" }}><PackageIcon size={28} /></div>
            <div className="vendor-stat-value">{orderStats ? orderStats.orders_total : "—"}</div>
            <div className="vendor-stat-label">Commandes totales</div>
          </div>
          <div className="vendor-stat-card">
            <div className="vendor-stat-icon" style={{ color: orderStats?.orders_awaiting > 0 ? "var(--gold-600)" : "var(--gold-600)" }}><ClockIcon size={28} /></div>
            <div className="vendor-stat-value" style={{ color: orderStats?.orders_awaiting > 0 ? "var(--gold-600)" : "inherit" }}>
              {orderStats ? orderStats.orders_awaiting : "—"}
            </div>
            <div className="vendor-stat-label">À préparer</div>
          </div>
        </div>

        <div className="vendor-quick-links">
          <Link href="/admin/shops" className="vendor-quick-link">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <StoreIcon size={20} style={{ color: "var(--gold-600)" }} /> <strong>Boutiques</strong>
            </div>
            <span>{pendingShopsCount > 0 ? `${pendingShopsCount} en attente de vérification` : "Gestion et vérification"}</span>
          </Link>
          <Link href="/admin/moderation" className="vendor-quick-link">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <ShieldCheckIcon size={20} style={{ color: "var(--gold-600)" }} /> <strong>Modération</strong>
            </div>
            <span>{pendingModerationCount > 0 ? `${pendingModerationCount} demande(s) en attente` : "Avis clients et sponsoring"}</span>
          </Link>
          <Link href="/admin/products" className="vendor-quick-link">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <PackageIcon size={20} style={{ color: "var(--gold-600)" }} /> <strong>Produits</strong>
            </div>
            <span>Stock détaillé par boutique</span>
          </Link>
          <Link href="/admin/analytics" className="vendor-quick-link">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <BarChartIcon size={20} style={{ color: "var(--gold-600)" }} /> <strong>Analytics</strong>
            </div>
            <span>Statistiques détaillées</span>
          </Link>
          <Link href="/admin/payouts" className="vendor-quick-link">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <CreditCardIcon size={20} style={{ color: "var(--gold-600)" }} /> <strong>Payouts</strong>
            </div>
            <span>{earnings ? `${earnings.released_count} payout(s) à libérer` : "Gestion des retraits vendeur"}</span>
          </Link>
          <Link href="/admin/conversations" className="vendor-quick-link">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <MessageIcon size={20} style={{ color: "var(--gold-600)" }} /> <strong>Conversations</strong>
            </div>
            <span>Surveillance vendeur ↔ client</span>
          </Link>
        </div>

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

        <div className="vendor-products-section">
          <h2>Ventes récentes ({filteredOrders.length})</h2>

          {loading ? (
            <p>Chargement...</p>
          ) : filteredOrders.length === 0 ? (
            <div className="empty-state">
              <div className="glyph" style={{ display: "inline-flex", color: "var(--gold-600)" }}><ShoppingCartIcon size={48} /></div>
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
                  <div className="order-meta" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, fontSize: "0.85rem" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <UserIcon size={14} /> {o.buyer_name} · {o.buyer_email}
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <StoreIcon size={14} /> {o.shop_count} boutique{o.shop_count > 1 ? "s" : ""}
                    </span>
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
