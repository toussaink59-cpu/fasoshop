"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const DOC_LABELS = { cni: "CNI", passeport: "Passeport", permis: "Permis" };
const STATUS_LABELS = { active: "Active", pending: "En attente", suspended: "Suspendue", rejected: "Rejetée" };

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [selectedShop, setSelectedShop] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingShopId, setUpdatingShopId] = useState(null);
  const [deletingReviewId, setDeletingReviewId] = useState(null);
  const [rejectingShopId, setRejectingShopId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const [orders, setOrders] = useState([]);
  const [orderStats, setOrderStats] = useState(null);

  const loadOrders = useCallback(async () => {
    const res = await fetch("/api/admin/orders");
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders || []);
      setOrderStats(data.stats || null);
    }
  }, []);

  const loadData = useCallback(async (shopId, lowOnly) => {
    const params = new URLSearchParams();
    if (shopId) params.set("shopId", shopId);
    if (lowOnly) params.set("lowStockOnly", "true");

    const [stockRes, shopsRes] = await Promise.all([
      fetch(`/api/admin/stock?${params.toString()}`),
      fetch("/api/admin/shops"),
    ]);

    if (stockRes.status === 401 || stockRes.status === 403) {
      router.push("/login");
      return;
    }

    const stockData = await stockRes.json();
    const shopsData = await shopsRes.json();
    setProducts(stockData.products || []);
    setShops(shopsData.shops || []);
    setLoading(false);
  }, [router]);

  const loadReviews = useCallback(async () => {
    const res = await fetch("/api/admin/reviews");
    if (res.ok) {
      const data = await res.json();
      setReviews(data.reviews || []);
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
        loadData("", false);
        loadReviews();
        loadOrders();
      });
  }, [loadData, loadReviews, loadOrders, router]);

  function applyFilters(shopId, lowOnly) {
    setSelectedShop(shopId);
    setLowStockOnly(lowOnly);
    setLoading(true);
    loadData(shopId, lowOnly);
  }

  async function handleShopStatusChange(shopId, newStatus, rejectionReason) {
    setError("");
    setUpdatingShopId(shopId);

    const res = await fetch(`/api/admin/shops/${shopId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, rejectionReason }),
    });
    const data = await res.json();

    setUpdatingShopId(null);

    if (!res.ok) {
      setError(data.error || "Erreur lors de la mise à jour du statut.");
      return;
    }

    setRejectingShopId(null);
    setRejectReason("");
    loadData(selectedShop, lowStockOnly);
  }

  function handleStartReject(shopId) {
    setRejectingShopId(shopId);
    setRejectReason("");
  }

  function handleConfirmReject(shopId) {
    if (!rejectReason.trim()) {
      setError("Merci de préciser un motif de rejet.");
      return;
    }
    handleShopStatusChange(shopId, "rejected", rejectReason);
  }

  async function handleDeleteReview(reviewId) {
    if (!window.confirm("Supprimer définitivement cet avis ?")) return;

    setError("");
    setDeletingReviewId(reviewId);

    const res = await fetch(`/api/admin/reviews/${reviewId}`, {
      method: "DELETE",
    });

    setDeletingReviewId(null);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Erreur lors de la suppression de l'avis.");
      return;
    }

    setReviews((r) => r.filter((rev) => rev.id !== reviewId));
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const totalStock = products.reduce((sum, p) => sum + p.stock_quantity, 0);
  const lowStockCount = products.filter((p) => p.stock_quantity <= p.low_stock_threshold).length;
  const pendingShopsCount = shops.filter((s) => s.status === "pending").length;

  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand">
          🛒 FasoShop <span className="role-tag">Admin</span>
        </div>
        <div className="topbar-actions">
          <button onClick={handleLogout}>Déconnexion</button>
        </div>
      </div>
      <div className="woven-strip" />

      <div className="content">
        <div className="page-header">
          <h1>Tableau de bord</h1>
          <p>{user ? `Connecté en tant que ${user.full_name}` : ""}</p>
        </div>

        {error && <div className="error-box">{error}</div>}

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
          {orders.length === 0 ? (
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

        <div className="stat-row">
          <div className="stat-card">
            <div className="label">Boutiques</div>
            <div className="value">{shops.length}</div>
          </div>
          <div className="stat-card">
            <div className="label">En attente de vérification</div>
            <div className="value" style={{ color: pendingShopsCount > 0 ? "var(--gold-600)" : "inherit" }}>
              {pendingShopsCount}
            </div>
          </div>
          <div className="stat-card">
            <div className="label">Unités en stock</div>
            <div className="value">{totalStock}</div>
          </div>
          <div className="stat-card">
            <div className="label">Stock faible</div>
            <div className="value" style={{ color: lowStockCount > 0 ? "var(--bissap-600)" : "inherit" }}>
              {lowStockCount}
            </div>
          </div>
        </div>

        <div className="panel">
          <h2>Boutiques</h2>
          <p style={{ fontSize: "0.85rem", color: "var(--ink-400)", marginTop: -8, marginBottom: 16 }}>
            Vérifiez le type et le numéro de pièce d'identité renseignés avant de valider une boutique.
          </p>
          <table>
            <thead>
              <tr>
                <th>Boutique</th>
                <th>Vendeur</th>
                <th>Pièce d'identité</th>
                <th>Produits</th>
                <th>Statut</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {shops.map((s) => (
                <tr key={s.id}>
                  <td>
                    <a onClick={() => applyFilters(String(s.id), lowStockOnly)} style={{ cursor: "pointer", fontWeight: 600 }}>
                      {s.name}
                    </a>
                  </td>
                  <td>
                    <div>{s.vendor_name}</div>
                    <div className="sku">{s.vendor_email}</div>
                  </td>
                  <td>
                    {s.id_document_type ? (
                      <div>{DOC_LABELS[s.id_document_type] || s.id_document_type} n° {s.id_document_number}</div>
                    ) : (
                      <span style={{ color: "var(--ink-400)" }}>—</span>
                    )}
                    {s.status === "rejected" && s.rejection_reason && (
                      <div className="sku" style={{ color: "var(--bissap-600)" }}>Motif : {s.rejection_reason}</div>
                    )}
                  </td>
                  <td>{s.product_count}</td>
                  <td>
                    <span className={`badge ${s.status === "active" ? "badge-ok" : "badge-low"}`}>
                      {STATUS_LABELS[s.status] || s.status}
                    </span>
                  </td>
                  <td>
                    {rejectingShopId === s.id ? (
                      <div className="stock-adjust">
                        <input
                          type="text"
                          placeholder="Motif du rejet"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          style={{ width: 160 }}
                        />
                        <button
                          className="btn btn-danger"
                          disabled={updatingShopId === s.id}
                          onClick={() => handleConfirmReject(s.id)}
                        >
                          {updatingShopId === s.id ? "..." : "Confirmer"}
                        </button>
                        <button className="btn btn-ghost" onClick={() => setRejectingShopId(null)}>
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <div className="stock-adjust">
                        {s.status !== "active" && (
                          <button
                            className="btn btn-primary"
                            disabled={updatingShopId === s.id}
                            onClick={() => handleShopStatusChange(s.id, "active")}
                          >
                            {updatingShopId === s.id ? "..." : "Valider"}
                          </button>
                        )}
                        {s.status !== "rejected" && s.status !== "active" && (
                          <button
                            className="btn btn-danger"
                            disabled={updatingShopId === s.id}
                            onClick={() => handleStartReject(s.id)}
                          >
                            Rejeter
                          </button>
                        )}
                        {s.status !== "suspended" && (
                          <button
                            className="btn btn-ghost"
                            disabled={updatingShopId === s.id}
                            onClick={() => handleShopStatusChange(s.id, "suspended")}
                          >
                            {updatingShopId === s.id ? "..." : "Suspendre"}
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <h2>Avis clients</h2>
          <p style={{ fontSize: "0.85rem", color: "var(--ink-400)", marginTop: -8, marginBottom: 16 }}>
            Modérez les avis abusifs, faux ou inappropriés.
          </p>

          {reviews.length === 0 ? (
            <p style={{ color: "var(--ink-400)" }}>Aucun avis pour l'instant.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Boutique</th>
                  <th>Auteur</th>
                  <th>Note</th>
                  <th>Commentaire</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.id}>
                    <td>{r.product_name}</td>
                    <td>{r.shop_name}</td>
                    <td>{r.buyer_name}</td>
                    <td>{"⭐".repeat(r.rating)}</td>
                    <td style={{ maxWidth: 260 }}>{r.comment || "—"}</td>
                    <td>{new Date(r.created_at).toLocaleDateString("fr-FR")}</td>
                    <td>
                      <button
                        className="btn btn-danger"
                        disabled={deletingReviewId === r.id}
                        onClick={() => handleDeleteReview(r.id)}
                      >
                        {deletingReviewId === r.id ? "..." : "Supprimer"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <h2 style={{ marginBottom: 0 }}>Détail des produits</h2>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <select
                value={selectedShop}
                onChange={(e) => applyFilters(e.target.value, lowStockOnly)}
                style={{ width: "auto" }}
              >
                <option value="">Toutes les boutiques</option>
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <button
                className={`btn ${lowStockOnly ? "btn-danger" : "btn-ghost"}`}
                onClick={() => applyFilters(selectedShop, !lowStockOnly)}
              >
                Stock faible uniquement
              </button>
            </div>
          </div>

          {loading ? (
            <p style={{ marginTop: 16 }}>Chargement...</p>
          ) : products.length === 0 ? (
            <div className="empty-state">
              <div className="glyph">📊</div>
              <p>Aucun produit ne correspond à ce filtre.</p>
            </div>
          ) : (
            <table style={{ marginTop: 16 }}>
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Boutique</th>
                  <th>Vendeur</th>
                  <th>Prix</th>
                  <th>Stock</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const isLow = p.stock_quantity <= p.low_stock_threshold;
                  return (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{p.shop_name}</td>
                      <td>{p.vendor_name}</td>
                      <td>{Number(p.price).toLocaleString("fr-FR")} FCFA</td>
                      <td>
                        <span className={`badge ${isLow ? "badge-low" : "badge-ok"}`}>
                          {p.stock_quantity} {isLow ? "· faible" : ""}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
