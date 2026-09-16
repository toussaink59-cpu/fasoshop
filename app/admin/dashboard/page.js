"use client";

// app/admin/dashboard/page.js — RÉÉCRITURE PRO
// Design system : app/dashboard.css
// API inchangées : /api/auth/me · /api/admin/orders · /api/admin/shops
//                  /api/admin/sponsorships · /api/admin/dashboard

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminBottomNav from "@/app/components/AdminBottomNav";
import KimoxaLogo from "@/app/components/KimoxaLogo";
import AdminAnalytics from "@/app/components/AdminAnalytics";
import {
  WalletIcon, ShoppingCartIcon, UserPlusIcon, CreditCardIcon,
  AlertTriangleIcon, PackageIcon, ClockIcon, StoreIcon, ShieldCheckIcon,
  MessageIcon, UploadIcon, CheckCircleIcon, BadgeCheckIcon, ArrowRightIcon,
} from "@/app/components/Icons";
import "../../dashboard.css";

const fmt = (n) => Number(n || 0).toLocaleString("fr-FR");
const fmtAmount = (n) => `${fmt(n)} FCFA`;

const ORDER_STATUS = {
  pending:     { label: "En attente",     cls: "status-pending" },
  paid:        { label: "Payée",          cls: "status-paid" },
  preparation: { label: "En préparation", cls: "status-preparation" },
  shipped:     { label: "Expédiée",       cls: "status-shipped" },
  delivered:   { label: "Livrée",         cls: "status-delivered" },
  cancelled:   { label: "Annulée",        cls: "status-cancelled" },
};

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [orderStats, setOrderStats] = useState(null);
  const [pendingShopsCount, setPendingShopsCount] = useState(0);
  const [pendingModerationCount, setPendingModerationCount] = useState(0);
  const [cockpitData, setCockpitData] = useState(null);

  const loadOrders = useCallback(async () => {
    const res = await fetch("/api/admin/orders");
    if (res.status === 401 || res.status === 403) { router.push("/login"); return; }
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
    fetch("/api/auth/me").then((r) => r.json()).then((data) => {
      if (!data.user || data.user.role !== "admin") { router.push("/login"); return; }
      setUser(data.user);
      loadOrders();
      loadBadgeCounts();
      fetch("/api/admin/dashboard").then((r) => r.json()).then((d) => setCockpitData(d));
    });
  }, [loadOrders, loadBadgeCounts, router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const payoutCount = cockpitData?.payouts?.released_count || 0;
  const payoutAmount = Number(cockpitData?.payouts?.released_amount || 0);
  const maxVendorRevenue = Math.max(1, ...(cockpitData?.topVendors || []).map((v) => Number(v.revenue) || 0));

  // ===== FILE DE TRAVAIL (priorisée) =====
  const workQueue = [];
  if (payoutCount > 0) workQueue.push({
    href: "/admin/payouts", Icon: CreditCardIcon, color: "var(--danger)",
    label: `Valider ${payoutCount} payout${payoutCount > 1 ? "s" : ""}`,
    detail: `${fmtAmount(payoutAmount)} à libérer aux vendeurs`,
  });
  if (pendingShopsCount > 0) workQueue.push({
    href: "/admin/shops", Icon: StoreIcon, color: "var(--warning)",
    label: `Vérifier ${pendingShopsCount} boutique${pendingShopsCount > 1 ? "s" : ""}`,
    detail: "Identités en attente de validation",
  });
  if (pendingModerationCount > 0) workQueue.push({
    href: "/admin/moderation", Icon: ShieldCheckIcon, color: "#6d28d9",
    label: `Traiter ${pendingModerationCount} modération${pendingModerationCount > 1 ? "s" : ""}`,
    detail: "Avis clients et sponsoring",
  });
  if (cockpitData?.alerts?.stagnantOrders > 0) workQueue.push({
    href: "/admin/orders?filter=stagnant", Icon: ClockIcon, color: "var(--warning)",
    label: `${cockpitData.alerts.stagnantOrders} commande(s) stagnante(s)`,
    detail: "Sans mouvement depuis plus de 3 jours",
  });
  if (cockpitData?.alerts?.lowStock > 0) workQueue.push({
    href: "/admin/products", Icon: PackageIcon, color: "var(--warning)",
    label: `${cockpitData.alerts.lowStock} produit(s) bientôt en rupture`,
    detail: "Stock à réapprovisionner",
  });

  return (
    <div>
      <div className="dash-topbar">
        <div className="dash-topbar-brand">
          <KimoxaLogo light size={20} />
          <span className="dash-topbar-role">Admin</span>
        </div>
        <div className="dash-topbar-actions">
          <Link href="/admin/analytics" className="tb-link">Analytics</Link>
          <button className="tb-logout" onClick={handleLogout}>Déconnexion</button>
        </div>
      </div>
      <div className="woven-strip" />

      <div className="dash-wrap">
        <div className="dash-head">
          <div>
            <h1 className="dash-title">Tableau de bord</h1>
            <p className="dash-sub">{user ? `Connecté en tant que ${user.full_name}` : "Chargement…"}</p>
          </div>
        </div>

        {/* ============ 1. PILOTAGE (KPIs) ============ */}
        {cockpitData && (
          <div className="dash-section">
            <div className="dash-section-label">Pilotage</div>
            <div className="kpi-grid">
              <div className="kpi">
                <div className="kpi-top">
                  <span className="kpi-icon"><WalletIcon size={22} /></span>
                  <span className={`kpi-delta ${cockpitData.revenue.week_delta >= 0 ? "kpi-delta--up" : "kpi-delta--down"}`}>
                    {cockpitData.revenue.week_delta >= 0 ? "▲" : "▼"} {Math.abs(cockpitData.revenue.week_delta)}%
                  </span>
                </div>
                <div className="kpi-value">{fmt(cockpitData.revenue.month)}</div>
                <div className="kpi-label">CA 30 jours (FCFA)</div>
                <div className="kpi-sub">
                  <span>Auj. <strong>{fmt(cockpitData.revenue.today)}</strong></span>
                  <span>7 j <strong>{fmt(cockpitData.revenue.week)}</strong></span>
                </div>
              </div>

              <div className="kpi">
                <div className="kpi-top">
                  <span className="kpi-icon"><UserPlusIcon size={22} /></span>
                </div>
                <div className="kpi-value">{fmt(cockpitData.customers.week)}</div>
                <div className="kpi-label">Nouveaux clients (7 j)</div>
                <div className="kpi-sub">
                  <span>Panier moyen <strong>{fmt(cockpitData.avgBasket)} F</strong></span>
                </div>
              </div>

              <div className="kpi">
                <div className="kpi-top">
                  <span className="kpi-icon"><ShoppingCartIcon size={22} /></span>
                  {orderStats?.orders_awaiting > 0 && (
                    <span className="kpi-delta kpi-delta--down">{fmt(orderStats.orders_awaiting)} à traiter</span>
                  )}
                </div>
                <div className="kpi-value">{orderStats ? fmt(orderStats.orders_today) : "—"}</div>
                <div className="kpi-label">Commandes aujourd'hui</div>
                <div className="kpi-sub">
                  <span>Total période <strong>{orderStats ? fmt(orderStats.orders_total) : "—"}</strong></span>
                </div>
              </div>

              <Link href="/admin/payouts" className={`kpi ${payoutCount > 0 ? "kpi--alert" : ""}`}>
                <div className="kpi-top">
                  <span className="kpi-icon"><CreditCardIcon size={22} /></span>
                </div>
                <div className="kpi-value">{payoutCount}</div>
                <div className="kpi-label">Payouts à libérer</div>
                <div className="kpi-sub">
                  <span><strong>{fmtAmount(payoutAmount)}</strong> en attente</span>
                </div>
              </Link>
            </div>
          </div>
        )}

        {/* ============ 2. FILE DE TRAVAIL ============ */}
        <div className="dash-section">
          <div className="dash-section-label">À traiter</div>
          {!cockpitData ? (
            <div className="skeleton" />
          ) : workQueue.length === 0 ? (
            <div className="queue">
              <div className="queue-item queue-item--ok">
                <span className="queue-icon"><CheckCircleIcon size={18} /></span>
                <span className="queue-text">
                  <span className="queue-label">Tout est à jour</span>
                  <span className="queue-detail">Boutiques, modération, payouts et commandes sont traités.</span>
                </span>
              </div>
            </div>
          ) : (
            <div className="queue">
              {workQueue.map((item) => {
                const Icon = item.Icon;
                return (
                  <Link key={item.href + item.label} href={item.href} className="queue-item" style={{ "--q-color": item.color }}>
                    <span className="queue-icon"><Icon size={18} /></span>
                    <span className="queue-text">
                      <span className="queue-label">{item.label}</span>
                      <span className="queue-detail">{item.detail}</span>
                    </span>
                    <span className="queue-arrow">→</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* ============ 3. SURVEILLANCE & OUTILS ============ */}
        <div className="dash-section">
          <div className="dash-section-label">Surveillance & outils</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
            <Link href="/admin/conversations" className="panel" style={{ textDecoration: "none", color: "inherit" }}>
              <div className="panel-body" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className="kpi-icon"><MessageIcon size={20} /></span>
                <span style={{ flex: 1 }}>
                  <strong style={{ display: "block" }}>Conversations</strong>
                  <span style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2 }}>
                    Surveillance vendeur ↔ client
                  </span>
                </span>
                <ArrowRightIcon size={18} style={{ color: "var(--gold)" }} />
              </div>
            </Link>

            <div className="panel">
              <div className="panel-body">
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <span className="kpi-icon"><UploadIcon size={20} /></span>
                  <strong>Exports CSV (Excel)</strong>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <a className="btn btn-ghost btn-sm" href="/api/admin/export?kind=orders"><ShoppingCartIcon size={14} /> Commandes</a>
                  <a className="btn btn-ghost btn-sm" href="/api/admin/export?kind=shops"><StoreIcon size={14} /> Boutiques</a>
                  <a className="btn btn-ghost btn-sm" href="/api/admin/export?kind=payouts"><CreditCardIcon size={14} /> Payouts</a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ============ 4. PERFORMANCE — TOP VENDEURS ============ */}
        {cockpitData && (
          <div className="dash-section">
            <div className="dash-section-label">Performance</div>
            <div className="panel">
              <div className="panel-head">
                <h3 className="panel-title"><BadgeCheckIcon size={18} /> Top vendeurs (mois)</h3>
              </div>
              <div className="panel-body">
                {cockpitData.topVendors.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: 0 }}>Aucune vente ce mois.</p>
                ) : (
                  cockpitData.topVendors.map((v, i) => (
                    <div className="rank-row" key={v.shop_name}>
                      <span className={`medal medal--${i + 1}`}>{i + 1}</span>
                      <div className="rank-main">
                        <span className="rank-name">{v.shop_name}</span>
                        <span className="rank-detail">{fmt(v.order_count)} commande(s)</span>
                        <div className="rank-bar">
                          <div className="rank-bar-fill" style={{ width: `${Math.max(4, Math.round((Number(v.revenue) / maxVendorRevenue) * 100))}%` }} />
                        </div>
                      </div>
                      <span className="rank-amount">{fmtAmount(v.revenue)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============ 5. ANALYTIQUE ============ */}
        <div className="dash-section">
          <div className="dash-section-label">Analytique</div>
          <AdminAnalytics />
        </div>

        {/* ============ 6. VENTES RÉCENTES ============ */}
        <div className="dash-section">
          <div className="dash-section-label">
            Ventes récentes
            <Link href="/admin/orders">Tout voir →</Link>
          </div>
          {loading ? (
            <div className="skeleton" />
          ) : orders.length === 0 ? (
            <div className="empty-block">
              <ShoppingCartIcon size={48} />
              <p>Aucune commande pour l'instant.</p>
            </div>
          ) : (
            <div className="pro-table-wrap">
              <table className="pro-table">
                <thead>
                  <tr>
                    <th>N°</th>
                    <th>Client</th>
                    <th>Statut</th>
                    <th style={{ textAlign: "right" }}>Montant</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 8).map((o) => {
                    const st = ORDER_STATUS[o.status] || { label: o.status, cls: "status-pending" };
                    return (
                      <tr key={o.id}>
                        <td className="cell-main">#{o.id}</td>
                        <td>
                          <span className="cell-main">{o.buyer_name || "—"}</span>
                          {o.buyer_email && <span className="cell-muted" style={{ display: "block" }}>{o.buyer_email}</span>}
                        </td>
                        <td><span className={`status-pill ${st.cls}`}>{st.label}</span></td>
                        <td className="amount">{fmtAmount(o.total_amount)}</td>
                        <td className="cell-muted">
                          {new Date(o.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <AdminBottomNav pendingShopsCount={pendingShopsCount} pendingModerationCount={pendingModerationCount} />
    </div>
  );
}