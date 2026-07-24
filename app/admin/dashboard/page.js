"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedShop, setSelectedShop] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingShopId, setUpdatingShopId] = useState(null);

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
      });
  }, [loadData, router]);

  function applyFilters(shopId, lowOnly) {
    setSelectedShop(shopId);
    setLowStockOnly(lowOnly);
    setLoading(true);
    loadData(shopId, lowOnly);
  }

  async function handleShopStatusChange(shopId, newStatus) {
    setError("");
    setUpdatingShopId(shopId);

    const res = await fetch(`/api/admin/shops/${shopId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const data = await res.json();

    setUpdatingShopId(null);

    if (!res.ok) {
      setError(data.error || "Erreur lors de la mise à jour du statut.");
      return;
    }

    loadData(selectedShop, lowStockOnly);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const totalStock = products.reduce((sum, p) => sum + p.stock_quantity, 0);
  const lowStockCount = products.filter((p) => p.stock_quantity <= p.low_stock_threshold).length;

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
          <h1>Stock — toutes les boutiques</h1>
          <p>{user ? `Connecté en tant que ${user.full_name}` : ""}</p>
        </div>

        {error && <div className="error-box">{error}</div>}

        <div className="stat-row">
          <div className="stat-card">
            <div className="label">Boutiques</div>
            <div className="value">{shops.length}</div>
          </div>
          <div className="stat-card">
            <div className="label">Produits affichés</div>
            <div className="value">{products.length}</div>
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
          <table>
            <thead>
              <tr>
                <th>Boutique</th>
                <th>Vendeur</th>
                <th>Produits</th>
                <th>Stock total</th>
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
                  <td>{s.vendor_name}</td>
                  <td>{s.product_count}</td>
                  <td>{s.total_stock}</td>
                  <td>
                    <span className={`badge ${s.status === "active" ? "badge-ok" : "badge-low"}`}>
                      {s.status === "active" ? "Active" : s.status === "pending" ? "En attente" : "Suspendue"}
                    </span>
                  </td>
                  <td>
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
