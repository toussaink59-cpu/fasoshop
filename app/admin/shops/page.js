"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import AdminBottomNav from "@/app/components/AdminBottomNav";

const DOC_LABELS = { cni: "CNI", passeport: "Passeport", permis: "Permis" };
const STATUS_LABELS = { active: "Active", pending: "En attente", suspended: "Suspendue", rejected: "Rejetée" };

export default function AdminShopsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingShopId, setUpdatingShopId] = useState(null);
  const [rejectingShopId, setRejectingShopId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const loadShops = useCallback(async () => {
    const res = await fetch("/api/admin/shops");
    if (res.status === 401 || res.status === 403) {
      router.push("/login");
      return;
    }
    const data = await res.json();
    setShops(data.shops || []);
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
        loadShops();
      });
  }, [loadShops, router]);

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
    loadShops();
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

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

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
          <h1>Boutiques</h1>
          <p>{user ? `Connecté en tant que ${user.full_name}` : ""}</p>
        </div>

        {error && <div className="error-box">{error}</div>}

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
        </div>

        <div className="panel">
          <h2>Boutiques</h2>
          <p style={{ fontSize: "0.85rem", color: "var(--ink-400)", marginTop: -8, marginBottom: 16 }}>
            Vérifiez le type et le numéro de pièce d'identité renseignés avant de valider une boutique.
          </p>

          {loading ? (
            <p>Chargement...</p>
          ) : (
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
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
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
          )}
        </div>
      </div>
      <AdminBottomNav pendingShopsCount={pendingShopsCount} />
    </div>
  );
}
