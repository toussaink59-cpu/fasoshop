"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import VendorBottomNav from "@/app/components/VendorBottomNav";

const STATUS_LABELS = {
  preparation: "En préparation",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
};

export default function VendorOrdersPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [shopId, setShopId] = useState(null);
  const [contactingId, setContactingId] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

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

  useEffect(() => {
    load();
    fetch("/api/vendor/shop")
      .then((r) => r.json())
      .then((d) => setShopId(d.shop?.id || null));
  }, [load]);

  useEffect(() => {
    function loadUnread() {
      fetch("/api/conversations/unread-count")
        .then((r) => r.json())
        .then((d) => setUnreadCount(d.unread || 0));
    }
    loadUnread();
    const timer = setInterval(loadUnread, 15000);
    return () => clearInterval(timer);
  }, []);

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

  async function handleContact(orderId) {
    if (!shopId) return;
    setError("");
    setContactingId(orderId);

    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, shopId }),
    });
    const data = await res.json();
    setContactingId(null);

    if (!res.ok) {
      setError(data.error || "Erreur lors de l'ouverture de la conversation.");
      return;
    }

    router.push(`/messages/${data.conversationId}`);
  }

  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand">🛒 FasoShop <span className="role-tag">Vendeur</span></div>
        <div className="topbar-actions">
          <Link href="/messages"><button>Messages {unreadCount > 0 ? `(${unreadCount})` : ""}</button></Link>
          <Link href="/vendor/dashboard"><button>Mon stock</button></Link>
        </div>
      </div>
      <div className="woven-strip" />

      <div className="content">
        <div className="page-header">
          <h1>Commandes reçues</h1>
          <p>Les commandes contenant vos produits. Le statut affiché concerne uniquement votre boutique — les autres vendeurs éventuellement présents dans la même commande gèrent leur propre statut indépendamment.</p>
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
                  <th>Statut (votre boutique)</th>
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
                      <span className={`status-pill status-${it.delivery_status}`}>
                        {STATUS_LABELS[it.delivery_status] || it.delivery_status}
                      </span>
                    </td>
                    <td>
                      <div className="stock-adjust">
                        {it.delivery_status === "preparation" && (
                          <button className="btn btn-primary" onClick={() => updateStatus(it.order_id, "shipped")}>
                            Marquer expédiée
                          </button>
                        )}
                        {it.delivery_status === "shipped" && (
                          <button className="btn btn-primary" onClick={() => updateStatus(it.order_id, "delivered")}>
                            Marquer livrée
                          </button>
                        )}
                        <button
                          className="btn btn-ghost"
                          onClick={() => handleContact(it.order_id)}
                          disabled={!shopId || contactingId === it.order_id}
                        >
                          💬 {contactingId === it.order_id ? "..." : "Contacter"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <VendorBottomNav unreadMessages={unreadCount} />
    </div>
  );
}
