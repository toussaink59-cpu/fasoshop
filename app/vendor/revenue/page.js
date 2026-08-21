"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SalesSparkline from "@/app/components/SalesSparkline";
import VendorBottomNav from "@/app/components/VendorBottomNav";
import KimoxaLogo from "@/app/components/KimoxaLogo";
import {
  ShoppingCartIcon, BarChartIcon, CheckCircleIcon, AlertTriangleIcon,
  CreditCardIcon, WalletIcon, InfoIcon,
} from "@/app/components/Icons";

export default function VendorRevenuePage() {
  const router = useRouter();
  const [revenue, setRevenue] = useState(null);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const loadRevenue = useCallback(async () => {
    const res = await fetch("/api/vendor/revenue");
    if (res.ok) { const data = await res.json(); setRevenue(data.revenue || null); }
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
        <div className="page-header"><h1>Revenus</h1></div>

        <div className="panel">
          <p style={{ fontSize: "0.85rem", color: "var(--ink-400)", marginTop: -8, marginBottom: 16 }}>
            Une commission de 8% est prélevée par Kimoxa sur chaque vente confirmée.
          </p>

          {!revenue ? <p>Chargement...</p> : (
            <>
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

              {revenue.dailySeries && revenue.dailySeries.some((d) => d.gross > 0) && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: "0.78rem", color: "var(--ink-400)", marginBottom: 8 }}>Ventes des 30 derniers jours</div>
                  <SalesSparkline data={revenue.dailySeries} />
                </div>
              )}

              <div style={{ marginBottom: 20, padding: "14px 16px", background: "var(--cream-50, #faf7f2)", borderRadius: 10, border: "1px solid var(--border)" }}>
                <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: "1rem", display: "flex", alignItems: "center", gap: 8 }}>
                  <WalletIcon size={18} /> Commissions Kimoxa (8%)
                </h3>
                <p style={{ fontSize: "0.82rem", color: "var(--ink-500)", margin: "0 0 12px 0" }}>
                  Sur les ventes <strong>Mobile Money</strong> : commission prélevée automatiquement.<br />
                  Sur les ventes en <strong>espèces</strong> : vous collectez la totalité et devez reverser 8% à Kimoxa.
                </p>

                <div className="stat-row">
                  <div className="stat-card" style={{ background: "#f0fdf4", borderColor: "#86efac" }}>
                    <div className="label" style={{ color: "#166534", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: 6 }}>
                      <CheckCircleIcon size={14} /> Auto-prélevées (Mobile Money)
                    </div>
                    <div className="value" style={{ color: "#166534" }}>{Number(revenue.mmCommissionSettled || 0).toLocaleString("fr-FR")} FCFA</div>
                  </div>
                  <div className="stat-card" style={{ background: "#fef9ee", borderColor: "#fcd34d" }}>
                    <div className="label" style={{ color: "#92400e", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: 6 }}>
                      <AlertTriangleIcon size={14} /> À reverser (espèces)
                    </div>
                    <div className="value" style={{ color: "#92400e" }}>{Number(revenue.codCommissionDue || 0).toLocaleString("fr-FR")} FCFA</div>
                  </div>
                </div>

                {Number(revenue.codCommissionDue || 0) > 0 && (
                  <div style={{ marginTop: 12, padding: "10px 14px", background: "#fff7ed", border: "1px solid #fdba74", borderRadius: 8, fontSize: "0.82rem", color: "#9a3412", display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <InfoIcon size={16} />
                    <div>Pour reverser ces commissions, contactez le support Kimoxa via Mobile Money avec la mention « Commission [nom boutique] ». Un reçu vous sera envoyé sous 24h.</div>
                  </div>
                )}
              </div>

              <div className="stat-row">
                <div className="stat-card">
                  <div className="label">Ventes brutes</div>
                  <div className="value">{Number(revenue.grossSales).toLocaleString("fr-FR")} FCFA</div>
                </div>
                <div className="stat-card">
                  <div className="label">Commission totale</div>
                  <div className="value">{Number(revenue.totalCommission).toLocaleString("fr-FR")} FCFA</div>
                </div>
                <div className="stat-card">
                  <div className="label">Solde à recevoir</div>
                  <div className="value" style={{ color: "var(--bissap-600)" }}>{Number(revenue.netAmountDue).toLocaleString("fr-FR")} FCFA</div>
                </div>
                <div className="stat-card">
                  <div className="label">Déjà versé</div>
                  <div className="value">{Number(revenue.netAmountSettled).toLocaleString("fr-FR")} FCFA</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <VendorBottomNav newOrdersCount={newOrdersCount} unreadMessages={unreadMessages} />
    </div>
  );
}
