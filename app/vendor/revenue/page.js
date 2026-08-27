"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SalesSparkline from "@/app/components/SalesSparkline";
import VendorBottomNav from "@/app/components/VendorBottomNav";
import KimoxaLogo from "@/app/components/KimoxaLogo";
import {
  ShoppingCartIcon, BarChartIcon, CheckCircleIcon, AlertTriangleIcon,
  WalletIcon, LockIcon, BanknoteIcon, ArrowUpRightIcon, InfoIcon,
  ClockIcon, XCircleIcon,
} from "@/app/components/Icons";

const STATUS_BADGES = {
  pending: { label: "En attente", color: "#f59e0b", bg: "#fef9ee", Icon: ClockIcon },
  approved: { label: "Approuvé", color: "#16a34a", bg: "#f0fdf4", Icon: CheckCircleIcon },
  rejected: { label: "Refusé", color: "#dc2626", bg: "#fef2f2", Icon: XCircleIcon },
  paid: { label: "Versé", color: "#059669", bg: "#f0fdf4", Icon: CheckCircleIcon },
};

export default function VendorRevenuePage() {
  const router = useRouter();
  const [revenue, setRevenue] = useState(null);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [requesting, setRequesting] = useState(false);
  const [requestMsg, setRequestMsg] = useState({ type: "", text: "" });

  const loadRevenue = useCallback(async () => {
    const res = await fetch("/api/vendor/revenue");
    if (res.ok) {
      const data = await res.json();
      setRevenue(data.revenue || null);
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((data) => {
      if (!data.user || (data.user.role !== "vendor" && data.user.role !== "admin")) {
        router.push("/login"); return;
      }
      loadRevenue();
    });
  }, [loadRevenue, router]);

  useEffect(() => {
    function loadUnread() {
      fetch("/api/conversations/unread-count").then((r) => r.json()).then((d) => setUnreadMessages(d.unread || 0));
    }
    loadUnread();
    const timer = setInterval(loadUnread, 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetch("/api/vendor/orders").then(async (res) => {
      if (!res.ok) return;
      const data = await res.json();
      const items = data.items || [];
      const pendingOrderIds = new Set(items.filter((it) => it.delivery_status === "preparation").map((it) => it.order_id));
      setNewOrdersCount(pendingOrderIds.size);
    });
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  async function handleRequestPayout() {
    setRequestMsg({ type: "", text: "" });
    if (!revenue?.disponible || revenue.disponible.amount < 1000) {
      setRequestMsg({ type: "error", text: "Minimum 1 000 FCFA pour demander un reversement." });
      return;
    }
    setRequesting(true);
    try {
      const res = await fetch("/api/vendor/payout-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: revenue.disponible.amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setRequestMsg({ type: "success", text: "Demande envoyée. L'admin traitera sous 24h." });
      setTimeout(() => loadRevenue(), 500);
    } catch (err) {
      setRequestMsg({ type: "error", text: err.message });
    } finally {
      setRequesting(false);
    }
  }

  if (!revenue) {
    return (
      <div className="shell">
        <div className="topbar"><div className="brand"><KimoxaLogo light size={20} /> <span className="role-tag">Vendeur</span></div></div>
        <div className="woven-strip" />
        <div className="content"><p>Chargement...</p></div>
      </div>
    );
  }

  const isVerified = revenue.shopStatus === 'active';
  const productLimit = 5;

  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand">
          <KimoxaLogo light size={20} /> <span className="role-tag">Vendeur</span>
        </div>
        <div className="topbar-actions">
          <Link href="/messages" style={{ marginRight: 10, color: "var(--sand-50)", fontSize: "0.85rem" }}>
            Messages {unreadMessages > 0 ? `(${unreadMessages})` : ""}
          </Link>
          <button onClick={handleLogout}>Déconnexion</button>
        </div>
      </div>
      <div className="woven-strip" />

      <div className="content">
        <div className="page-header">
          <h1>Revenus</h1>
          <p style={{ fontSize: "0.85rem", color: "var(--ink-400)", marginTop: -8, marginBottom: 16 }}>
            Commission Kimoxa : 8% prélevés à la libération des fonds.
          </p>
        </div>

        {!isVerified && (
          <div style={{
            padding: "14px 16px", marginBottom: 20,
            background: "#fef9ee", border: "1px solid #fcd34d",
            borderRadius: 10, display: "flex", alignItems: "flex-start", gap: 10,
          }}>
            <AlertTriangleIcon size={18} style={{ color: "#92400e", flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1, fontSize: "0.88rem", color: "#92400e", lineHeight: 1.5 }}>
              <strong>Boutique non vérifiée</strong><br />
              Vous avez publié <strong>{revenue.productsCount || 0}/{productLimit}</strong> produits.
              Vérifiez votre identité pour publier sans limite et activer les reversements.
              <div style={{ marginTop: 8 }}>
                <Link href="/vendor/account" style={{ color: "#92400e", fontWeight: 600, textDecoration: "underline" }}>
                  Vérifier ma boutique →
                </Link>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, marginBottom: 20 }}>
          <div style={{ padding: "18px", borderRadius: 12, background: "#fff", border: "1px solid var(--border)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, #f59e0b, #fbbf24)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(245,158,11,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <LockIcon size={18} style={{ color: "#f59e0b" }} />
              </div>
              <div>
                <div style={{ fontSize: "0.78rem", color: "var(--ink-500)", fontWeight: 600, letterSpacing: "0.02em" }}>SÉQUESTRÉS</div>
                <div style={{ fontSize: "0.72rem", color: "var(--ink-400)" }}>en attente de confirmation</div>
              </div>
            </div>
            <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--ink-900)", letterSpacing: "-0.02em" }}>
              {Number(revenue.sequestre?.amount || 0).toLocaleString("fr-FR")} <span style={{ fontSize: "0.9rem", color: "var(--ink-500)", fontWeight: 500 }}>FCFA</span>
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--ink-500)", marginTop: 4 }}>
              {revenue.sequestre?.orders || 0} commande{(revenue.sequestre?.orders || 0) > 1 ? "s" : ""}
            </div>
          </div>

          <div style={{ padding: "18px", borderRadius: 12, background: "#fff", border: "1px solid var(--border)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, #16a34a, #22c55e)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(22,163,74,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CheckCircleIcon size={18} style={{ color: "#16a34a" }} />
              </div>
              <div>
                <div style={{ fontSize: "0.78rem", color: "var(--ink-500)", fontWeight: 600, letterSpacing: "0.02em" }}>DISPONIBLES</div>
                <div style={{ fontSize: "0.72rem", color: "var(--ink-400)" }}>prêts à reverser</div>
              </div>
            </div>
            <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#16a34a", letterSpacing: "-0.02em" }}>
              {Number(revenue.disponible?.amount || 0).toLocaleString("fr-FR")} <span style={{ fontSize: "0.9rem", color: "var(--ink-500)", fontWeight: 500 }}>FCFA</span>
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--ink-500)", marginTop: 4 }}>
              {revenue.disponible?.orders || 0} commande{(revenue.disponible?.orders || 0) > 1 ? "s" : ""}
            </div>
          </div>

          <div style={{ padding: "18px", borderRadius: 12, background: "#fff", border: "1px solid var(--border)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, #6366f1, #818cf8)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(99,102,241,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <BanknoteIcon size={18} style={{ color: "#6366f1" }} />
              </div>
              <div>
                <div style={{ fontSize: "0.78rem", color: "var(--ink-500)", fontWeight: 600, letterSpacing: "0.02em" }}>REVERSÉS</div>
                <div style={{ fontSize: "0.72rem", color: "var(--ink-400)" }}>déjà sur votre compte</div>
              </div>
            </div>
            <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#6366f1", letterSpacing: "-0.02em" }}>
              {Number(revenue.reverse?.amount || 0).toLocaleString("fr-FR")} <span style={{ fontSize: "0.9rem", color: "var(--ink-500)", fontWeight: 500 }}>FCFA</span>
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--ink-500)", marginTop: 4 }}>
              {revenue.reverse?.orders || 0} commande{(revenue.reverse?.orders || 0) > 1 ? "s" : ""}
            </div>
          </div>
        </div>

        {isVerified && revenue.disponible?.amount >= 1000 && (
          <div style={{ padding: "16px 18px", marginBottom: 20, background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)", border: "1px solid #86efac", borderRadius: 12, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: "0.82rem", color: "#166534", fontWeight: 600, marginBottom: 2 }}>
                <WalletIcon size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                Reversement disponible
              </div>
              <div style={{ fontSize: "0.78rem", color: "#166534" }}>
                {Number(revenue.disponible.amount).toLocaleString("fr-FR")} FCFA → Mobile Money
              </div>
            </div>
            <button
              onClick={handleRequestPayout}
              disabled={requesting || !!revenue.pendingRequest?.count}
              className="btn btn-primary"
              style={{ padding: "10px 20px", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 8, opacity: (requesting || revenue.pendingRequest?.count) ? 0.6 : 1 }}
            >
              {requesting ? "Envoi..." : (revenue.pendingRequest?.count ? "Demande en cours" : (<>Demander reversement <ArrowUpRightIcon size={16} /></>))}
            </button>
          </div>
        )}

        {requestMsg.text && (
          <div style={{ padding: "10px 14px", marginBottom: 20, borderRadius: 8, background: requestMsg.type === "success" ? "#f0fdf4" : "#fef2f2", border: `1px solid ${requestMsg.type === "success" ? "#86efac" : "#fca5a5"}`, color: requestMsg.type === "success" ? "#166534" : "#991b1b", fontSize: "0.87rem" }}>
            {requestMsg.text}
          </div>
        )}

        {revenue.recentRequests?.length > 0 && (
          <div style={{ padding: "16px 18px", marginBottom: 20, background: "#fff", border: "1px solid var(--border)", borderRadius: 10 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: "0.95rem", fontWeight: 600 }}>Mes demandes de reversement</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {revenue.recentRequests.map((req) => {
                const badge = STATUS_BADGES[req.status] || STATUS_BADGES.pending;
                const Icon = badge.Icon;
                return (
                  <div key={req.id} style={{ padding: "10px 12px", background: badge.bg, borderRadius: 8, display: "flex", alignItems: "center", gap: 10, fontSize: "0.85rem" }}>
                    <Icon size={16} style={{ color: badge.color, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <strong>{Number(req.amount).toLocaleString("fr-FR")} FCFA</strong>
                      <div style={{ fontSize: "0.75rem", color: "var(--ink-500)", marginTop: 2 }}>
                        {new Date(req.createdAt).toLocaleDateString("fr-FR")}
                        {req.adminNotes && ` · ${req.adminNotes}`}
                      </div>
                    </div>
                    <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: "0.72rem", fontWeight: 600, color: badge.color, background: "rgba(255,255,255,0.7)" }}>
                      {badge.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="panel" style={{ marginTop: 20 }}>
          <h3 style={{ margin: "0 0 14px", fontSize: "1rem", fontWeight: 600 }}>
            <BarChartIcon size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />
            Performance commerciale
          </h3>

          <div className="stat-row">
            <div className="stat-card">
              <div className="label" style={{ display: "flex", alignItems: "center", gap: 6 }}><ShoppingCartIcon size={14} /> Ventes aujourd'hui</div>
              <div className="value">{Number(revenue.todaySales).toLocaleString("fr-FR")} FCFA</div>
              <div style={{ fontSize: "0.78rem", color: "var(--ink-400)", marginTop: 2 }}>
                {revenue.todayOrderCount} commande{revenue.todayOrderCount > 1 ? "s" : ""}
              </div>
            </div>
            <div className="stat-card">
              <div className="label" style={{ display: "flex", alignItems: "center", gap: 6 }}><BarChartIcon size={14} /> Ventes ce mois-ci</div>
              <div className="value">{Number(revenue.monthSales).toLocaleString("fr-FR")} FCFA</div>
              <div style={{ fontSize: "0.78rem", color: "var(--ink-400)", marginTop: 2 }}>
                {revenue.monthOrderCount} commande{revenue.monthOrderCount > 1 ? "s" : ""}
              </div>
            </div>
          </div>

          {revenue.dailySeries?.some((d) => d.gross > 0) && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: "0.78rem", color: "var(--ink-400)", marginBottom: 8 }}>Ventes des 30 derniers jours</div>
              <SalesSparkline data={revenue.dailySeries} />
            </div>
          )}

          <div className="stat-row" style={{ marginTop: 16 }}>
            <div className="stat-card">
              <div className="label">Ventes brutes</div>
              <div className="value">{Number(revenue.grossSales).toLocaleString("fr-FR")} FCFA</div>
            </div>
            <div className="stat-card">
              <div className="label">Commission totale (8%)</div>
              <div className="value">{Number(revenue.totalCommission).toLocaleString("fr-FR")} FCFA</div>
            </div>
          </div>

          <div style={{ marginTop: 14, padding: "10px 14px", background: "#f9fafb", borderRadius: 8, fontSize: "0.78rem", color: "var(--ink-500)", display: "flex", alignItems: "flex-start", gap: 8 }}>
            <InfoIcon size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              Les fonds sont libérés <strong>immédiatement</strong> quand le client confirme la réception.
              En cas d'absence de confirmation, libération automatique après <strong>3 jours</strong>.
            </div>
          </div>
        </div>
      </div>
      <VendorBottomNav newOrdersCount={newOrdersCount} unreadMessages={unreadMessages} />
    </div>
  );
}
