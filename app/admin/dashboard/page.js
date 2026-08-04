"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminBottomNav from "@/app/components/AdminBottomNav";

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [orderStats, setOrderStats] = useState(null);
  const [pendingShopsCount, setPendingShopsCount] = useState(0);
  const [pendingModerationCount, setPendingModerationCount] = useState(0);

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

  // Compteurs pour les badges de la bottom nav (Boutiques en attente,
  // demandes de sponsoring en attente) — requêtes légères, indépendantes
  // des pages Boutiques/Modération elles-mêmes.
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
      });
  }, [loadOrders, loadBadgeCounts, router]);

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
          <Link href="/admin/analytics"><button>Analytics</button></Link>
          <button onClick={handleLogout}>Déconnexion</button>
        </div>
      </div>
      <div className="woven-strip" />

      <div className="content">
        <div className="page-header">
          <h1>Tableau de bord</h1>
          <p>{user ? `Connecté en tant que ${user.full_name}` : ""}</p>
        </div>

        <div className="stat-row">
          <div className="stat-card">
            <div className="label">Commandes aujourd'hui</div>
            <div className="value">{orderStats ? orderStats.orders_today : "—"}</div>
          </div>
          <div className="stat-card">
            <div className="label">CA aujourd'hui</div>
            <div className="value">
              {orderStats ? `${Number(orderStats.revenue_today).toLocaleString("fr-FR")} FCFA` : "—"}
            </div>
          </div>
          <div className="stat-card">
            <div className="label">Commandes totales</div>
            <div className="value">{orderStats ? orderStats.orders_total : "—"}</div>
          </div>
          <div className="stat-card">
            <div className="label">En attente de préparation</div>
            <div className="value" style={{ color: orderStats?.orders_awaiting > 0 ? "var(--gold-600)" : "inherit" }}>
              {orderStats ? orderStats.orders_awaiting : "—"}
            </div>
          </div>
        </div>

        <div className="panel">
          <h2>Ventes récentes</h2>
          {loading ? (
            <p style={{ color: "var(--ink-400)" }}>Chargement...</p>
          ) : orders.length === 0 ? (
            <p style={{ color: "var(--ink-400)" }}>Aucune commande pour l'instant.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Client</th>
                  <th>Boutiques</th>
                  <th>Montant</th>
                  <th>Statut</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>#{o.id}</td>
                    <td>
                      <div>{o.buyer_name}</div>
                      <div className="sku">{o.buyer_email}</div>
                    </td>
                    <td>{o.shop_count}</td>
                    <td>{Number(o.total_amount).toLocaleString("fr-FR")} FCFA</td>
                    <td>
                      <span className="badge badge-ok">{o.status}</span>
                    </td>
                    <td>{new Date(o.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="quick-links-row" style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <Link href="/admin/shops" className="panel" style={{ flex: 1, minWidth: 180, textDecoration: "none", color: "inherit" }}>
            🏪 <strong>Boutiques</strong>
            <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--ink-400)" }}>
              {pendingShopsCount > 0 ? `${pendingShopsCount} en attente de vérification` : "Gestion et vérification"}
            </p>
          </Link>
          <Link href="/admin/moderation" className="panel" style={{ flex: 1, minWidth: 180, textDecoration: "none", color: "inherit" }}>
            🛡️ <strong>Modération</strong>
            <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--ink-400)" }}>
              {pendingModerationCount > 0 ? `${pendingModerationCount} demande(s) de sponsoring en attente` : "Avis clients et sponsoring"}
            </p>
          </Link>
          <Link href="/admin/products" className="panel" style={{ flex: 1, minWidth: 180, textDecoration: "none", color: "inherit" }}>
            📦 <strong>Produits</strong>
            <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--ink-400)" }}>Stock détaillé par boutique</p>
          </Link>
        </div>
      </div>
      <AdminBottomNav pendingShopsCount={pendingShopsCount} pendingModerationCount={pendingModerationCount} />
    </div>
  );
}
