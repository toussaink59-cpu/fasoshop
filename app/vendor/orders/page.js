"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const STATUS_LABELS = {
  pending: "En attente",
  paid: "Payée",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
};

export default function VendorOrdersPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/vendor/orders");
    if (res.status === 401 || res.status === 403) {
      router.push("/login");
      return;
    }
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(orderId, status) {
    setError("");
    const res = await fetch(`/api/vendor/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Erreur lors de la mise à jour.");
      return;
    }
    load();
  }

  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand">🛒 FasoShop <span className="role-tag">Vendeur</span></div>
        <div className="topbar-actions">
          <Link href="/vendor/dashboard"><button>Mon stock</button></Link>
        </div>
      </div>
      <div className="woven-strip" />

      <div className="content">
        <div className="page-header">
          <h1>Commandes reçues</h1>
          <p>Les commandes contenant vos produits, toutes boutiques confondues étant exclues.</p>
        </div>

        {error && <div className="error-box">{error}</div>}

        {loading ? (
          <p>Chargement...</p>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="glyph">📬</div>
            <p>Aucune commande pour l'instant.</p>
          </div>
        ) : (
          <div className="panel">
            <table>
              <thead>
                <tr>
                  <th>Commande</th>
                  <th>Produit</th>
                  <th>Qté</th>
                  <th>Livraison</th>
                  <th>Paiement</th>
                  <th>Statut</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.item_id}>
                    <td>#{it.order_id}</td>
                    <td>{it.product_name}</td>
                    <td>{it.quantity}</td>
                    <td>
                      <div>{it.shipping_address}</div>
                      <div className="sku">{it.phone}</div>
                    </td>
                    <td>{it.payment_method === "mobile_money" ? "📱 Mobile Money" : "💵 À la livraison"}</td>
                    <td>
                      <span className={`status-pill status-${it.status}`}>
                        {STATUS_LABELS[it.status] || it.status}
                      </span>
                    </td>
                    <td>
                      {it.status === "pending" && (
                        <button className="btn btn-primary" onClick={() => updateStatus(it.order_id, "shipped")}>
                          Marquer expédiée
                        </button>
                      )}
                      {it.status === "shipped" && (
                        <button className="btn btn-primary" onClick={() => updateStatus(it.order_id, "delivered")}>
                          Marquer livrée
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
