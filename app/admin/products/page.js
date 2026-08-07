"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminBottomNav from "@/app/components/AdminBottomNav";
import KimoxaLogo from "@/app/components/KimoxaLogo";

export default function AdminProductsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedShop, setSelectedShop] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [loading, setLoading] = useState(true);

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

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const totalStock = products.reduce((sum, p) => sum + p.stock_quantity, 0);
  const lowStockCount = products.filter((p) => p.stock_quantity <= p.low_stock_threshold).length;

  return (
    <div className="shell">
      {/* ===== TOPBAR TEMU ===== */}
      <div className="topbar">
        <div className="brand">
          <KimoxaLogo light size={20} /> <span className="role-tag">Admin</span>
        </div>
        <div className="topbar-actions">
          <Link href="/admin/dashboard" className="topbar-textlink">Tableau de bord</Link>
          <button className="topbar-logout" onClick={handleLogout}>Déconnexion</button>
        </div>
      </div>
      <div className="woven-strip" />

      <div className="vendor-dashboard-wrap">
        <div className="vendor-dashboard-header">
          <h1>Produits</h1>
          <p>{user ? `Connecté en tant que ${user.full_name}` : ""}</p>
        </div>

        {/* Cartes stats (même style que le dashboard) */}
        <div className="vendor-stats-grid">
          <div className="vendor-stat-card">
            <div className="vendor-stat-icon">📦</div>
            <div className="vendor-stat-value">{totalStock}</div>
            <div className="vendor-stat-label">Unités en stock</div>
          </div>
          <div className="vendor-stat-card">
            <div className="vendor-stat-icon">⚠️</div>
            <div className="vendor-stat-value" style={{ color: lowStockCount > 0 ? "var(--bissap-600)" : "inherit" }}>
              {lowStockCount}
            </div>
            <div className="vendor-stat-label">Stock faible</div>
          </div>
        </div>

        <div className="ana-panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <h2 style={{ margin: 0 }}>Détail des produits</h2>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
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
      <AdminBottomNav />
    </div>
  );
}
