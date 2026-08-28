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
  BadgeCheckIcon, UploadIcon, MessageIcon, UserIcon, CheckCircleIcon,
} from "@/app/components/Icons";

const SectionLabel = ({ children }) => (
  <div style={{ fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-400, #8a7f6d)", fontWeight: 700, marginBottom: 8 }}>
    {children}
  </div>
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
        fetch("/api/admin/dashboard").then((r) => r.json()).then((d) => setCockpitData(d));
      });
  }, [loadOrders, loadBadgeCounts, router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const filteredOrders = orderFilter === "all" ? orders : orders.filter((o) => o.status === orderFilter);
  const countBy = (s) => orders.filter((o) => o.status === s).length;

  const payoutCount = cockpitData?.payouts?.released_count || 0;
  const payoutAmount = Number(cockpitData?.payouts?.released_amount || 0);

  // ===== FILE DE TRAVAIL (priorisée) =====
  const workQueue = [];
  if (payoutCount > 0) workQueue.push({
    href: "/admin/payouts", Icon: CreditCardIcon, color: "#c62828", bg: "#fdecea",
    label: `Valider ${payoutCount} payout${payoutCount > 1 ? "s" : ""}`,
    detail: `${payoutAmount.toLocaleString("fr-FR")} FCFA à libérer aux vendeurs`,
  });
  if (pendingShopsCount > 0) workQueue.push({
    href: "/admin/shops", Icon: StoreIcon, color: "#92400e", bg: "#fef9ee",
    label: `Vérifier ${pendingShopsCount} boutique${pendingShopsCount > 1 ? "s" : ""}`,
    detail: "Identités en attente de validation",
  });
  if (pendingModerationCount > 0) workQueue.push({
    href: "/admin/moderation", Icon: ShieldCheckIcon, color: "#6d28d9", bg: "#f5f3ff",
    label: `Traiter ${pendingModerationCount} modération${pendingModerationCount > 1 ? "s" : ""}`,
    detail: "Avis clients et sponsoring",
  });
  if (cockpitData?.alerts?.stagnantOrders > 0) workQueue.push({
    href: "/admin/orders?filter=stagnant", Icon: ClockIcon, color: "#856404", bg: "#fff3cd",
    label: `${cockpitData.alerts.stagnantOrders} commande(s) stagnante(s)`,
    detail: "Sans mouvement depuis plus de 3 jours",
  });
  if (cockpitData?.alerts?.lowStock > 0) workQueue.push({
    href: "/admin/products", Icon: PackageIcon, color: "#856404", bg: "#fff3cd",
    label: `${cockpitData.alerts.lowStock} produit(s) bientôt en rupture`,
    detail: "Stock à réapprovisionner",
  });

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
          <h1>Tableau de bord</h1>
          <p>{user ? `Connecté en tant que ${user.full_name}` : ""}</p>
        </div>

        {/* ============ 1. PILOTAGE (KPIs) ============ */}
        {cockpitData && (
          <section style={{ marginBottom: 24 }}>
            <SectionLabel>Pilotage</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
              <div className="vendor-stat-card">
                <div className="vendor-stat-icon" style={{ color: "var(--gold-600)" }}><WalletIcon size={24} /></div>
                <div className="vendor-stat-value" style={{ fontSize: "1.2rem" }}>
                  {cockpitData.revenue.month.toLocaleString("fr-FR")}
                </div>
                <div className="vendor-stat-label">CA 30 j (FCFA)</div>
                <div style={{ marginTop: 8, fontSize: "0.75rem", color: "#666", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                  <span>Auj. <strong>{cockpitData.revenue.today.toLocaleString("fr-FR")}</strong></span>
                  <span>7 j <strong>{cockpitData.revenue.week.toLocaleString("fr-FR")}</strong>{" "}
                    <em style={{ color: cockpitData.revenue.week_delta >= 0 ? "#2e7d32" : "#c62828", fontStyle: "normal" }}>
                      {cockpitData.revenue.week_delta >= 0 ? "+" : ""}{cockpitData.revenue.week_delta}%
                    </em>
                  </span>
                </div>
              </div>

              <div className="vendor-stat-card">
                <div className="vendor-stat-icon" style={{ color: "var(--gold-600)" }}><UserPlusIcon size={24} /></div>
                <div className="vendor-stat-value">{cockpitData.customers.week}</div>
                <div className="vendor-stat-label">Nouveaux clients (7 j)</div>
                <div style={{ marginTop: 8, fontSize: "0.75rem", color: "#666" }}>
                  Panier moyen : <strong>{cockpitData.avgBasket.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} F</strong>
                </div>
              </div>

              <div className="vendor-stat-card">
                <div className="vendor-stat-icon" style={{ color: "var(--gold-600)" }}><ShoppingCartIcon size={24} /></div>
                <div className="vendor-stat-value">{orderStats ? orderStats.orders_today : "—"}</div>
                <div className="vendor-stat-label">Commandes aujourd'hui</div>
                <div style={{ marginTop: 8, fontSize: "0.75rem", color: "#666", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                  <span>À préparer : <strong style={{ color: orderStats?.orders_awaiting > 0 ? "var(--gold-600)" : "#222" }}>{orderStats ? orderStats.orders_awaiting : "—"}</strong></span>
                  <span>Total : <strong>{orderStats ? orderStats.orders_total : "—"}</strong></span>
                </div>
              </div>

              <Link href="/admin/payouts" className="vendor-stat-card" style={{ textDecoration: "none", cursor: "pointer" }}>
                <div className="vendor-stat-icon" style={{ color: payoutCount > 0 ? "#c62828" : "var(--gold-600)" }}><CreditCardIcon size={24} /></div>
                <div className="vendor-stat-value" style={{ color: payoutCount > 0 ? "#c62828" : undefined }}>{payoutCount}</div>
                <div className="vendor-stat-label">Payouts à libérer</div>
                <div style={{ marginTop: 8, fontSize: "0.75rem", color: "#666" }}>
                  {payoutAmount.toLocaleString("fr-FR")} FCFA en attente
                </div>
              </Link>
            </div>
          </section>
        )}

        {/* ============ 2. FILE DE TRAVAIL ============ */}
        <section style={{ marginBottom: 24 }}>
          <SectionLabel>À traiter</SectionLabel>
          {!cockpitData ? (
            <p style={{ color: "#666", fontSize: "0.9rem" }}>Chargement…</p>
          ) : workQueue.length === 0 ? (
            <div className="va-card" style={{ background: "#f0fdf4", border: "1px solid #86efac", display: "flex", alignItems: "center", gap: 10, padding: "14px 16px" }}>
              <CheckCircleIcon size={20} style={{ color: "#16a34a", flexShrink: 0 }} />
              <div style={{ fontSize: "0.9rem", color: "#166534" }}>
                <strong>Tout est à jour.</strong> Aucune action en attente : boutiques, modération, payouts et commandes sont traités.
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {workQueue.map((item) => {
                const Icon = item.Icon;
                return (
                  <Link key={item.href + item.label} href={item.href} className="va-card"
                    style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderLeft: `4px solid ${item.color}` }}>
                    <span style={{ width: 38, height: 38, borderRadius: 10, background: item.bg, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={18} style={{ color: item.color }} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ display: "block", color: "#222", fontSize: "0.92rem" }}>{item.label}</strong>
                      <span style={{ display: "block", color: "#666", fontSize: "0.78rem", marginTop: 2 }}>{item.detail}</span>
                    </span>
                    <span style={{ color: item.color, fontWeight: 700, fontSize: "1.1rem", flexShrink: 0 }}>→</span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* ============ 3. SURVEILLANCE & OUTILS ============ */}
        <section style={{ marginBottom: 24 }}>
          <SectionLabel>Surveillance & outils</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
            <Link href="/admin/conversations" className="va-card" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
              <span style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(212,175,55,0.12)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <MessageIcon size={20} style={{ color: "var(--gold-600)" }} />
              </span>
              <span style={{ flex: 1 }}>
                <strong style={{ display: "block", color: "#222" }}>Conversations</strong>
                <span style={{ display: "block", color: "#666", fontSize: "0.8rem", marginTop: 2 }}>Surveillance vendeur ↔ client</span>
              </span>
              <span style={{ color: "var(--gold-600)", fontWeight: 700 }}>→</span>
            </Link>

            <div className="va-card" style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(212,175,55,0.12)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <UploadIcon size={20} style={{ color: "var(--gold-600)" }} />
                </span>
                <strong style={{ color: "#222" }}>Exports CSV (Excel)</strong>
              </div>
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
          </div>
        </section>

        {/* ============ 4. PERFORMANCE ============ */}
        {cockpitData && (
          <section style={{ marginBottom: 24 }}>
            <SectionLabel>Performance</SectionLabel>
            <div className="va-card">
              <h3 style={{ margin: "0 0 12px 0", fontSize: "1.05rem", display: "flex", alignItems: "center", gap: 8 }}>
                <BadgeCheckIcon size={18} /> Top 3 vendeurs (mois)
              </h3>
              {cockpitData.topVendors.length === 0 ? (
                <p style={{ color: "#666", fontSize: "0.9rem" }}>Aucune vente ce mois</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {cockpitData.topVendors.map((v, i) => (
                    <div key={v.shop_name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", minWidth: 0, flex: 1 }}>
                        <MedalBadge rank={i + 1} />
                        <div style={{ minWidth: 0 }}>
                          <strong style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.shop_name}</strong>
                          <div style={{ fontSize: "0.85rem", color: "#666" }}>{v.order_count} commande(s)</div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flex: "none" }}>
                        <div style={{ fontWeight: "bold", color: "#d4af37", whiteSpace: "nowrap" }}>
                          {Number(v.revenue).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} FCFA
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ============ 5. VENTES RÉCENTES ============ */}
        <section style={{ marginBottom: 24 }}>
          <SectionLabel>Ventes récentes</SectionLabel>
          <div className="vendor-filters" style={{ marginBottom: 12 }}>
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
        </section>

        {/* ============ 6. ANALYTIQUE ============ */}
        <section>
          <SectionLabel>Analytique</SectionLabel>
          <AdminAnalytics />
          <AdminInsights />
        </section>
      </div>
      <AdminBottomNav pendingShopsCount={pendingShopsCount} pendingModerationCount={pendingModerationCount} />
    </div>
  );
}
