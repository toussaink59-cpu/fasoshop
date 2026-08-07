"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import VendorBottomNav from "@/app/components/VendorBottomNav";
import KimoxaLogo from "@/app/components/KimoxaLogo";

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
  const [orderFilter, setOrderFilter] = useState("all");

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

  // 1 carte = 1 commande (articles regroupés par n° de commande)
  const orders = useMemo(() => {
    const map = new Map();
    for (const it of items) {
      if (!map.has(it.order_id)) {
        map.set(it.order_id, {
          order_id: it.order_id,
          delivery_status: it.delivery_status,
          shipping_address: it.shipping_address,
          phone: it.phone,
          payment_method: it.payment_method,
          created_at: it.created_at || null,
          items: [],
        });
      }
      map.get(it.order_id).items.push(it);
    }
    return [...map.values()];
  }, [items]);

  const filteredOrders =
    orderFilter === "all" ? orders : orders.filter((o) => o.delivery_status === orderFilter);
  const countBy = (s) => orders.filter((o) => o.delivery_status === s).length;

  return (
    <div className="shell">
      {/* ===== TOPBAR TEMU ===== */}
      <div className="topbar">
        <div className="brand">
          <KimoxaLogo light size={20} /> <span className="role-tag">Vendeur</span>
        </div>
        <div className="topbar-actions">
          <Link href="/messages" className="topbar-icon" aria-label="Messages">
            💬
            {unreadCount > 0 && (
              <span className="topbar-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
            )}
          </Link>
          <Link href="/vendor/dashboard" className="topbar-textlink">Mon stock</Link>
        </div>
      </div>
      <div className="woven-strip" />

      <div className="vendor-dashboard-wrap">
        <div className="vendor-dashboard-header">
          <h1>Commandes reçues</h1>
          <p>Le statut concerne uniquement votre boutique.</p>
        </div>

        {error && <div className="error-box">{error}</div>}

        {/* Onglets de filtrage */}
        <div className="vendor-filters">
          <button className={`vendor-filter-btn ${orderFilter === "all" ? "active" : ""}`} onClick={() => setOrderFilter("all")}>
            Toutes ({orders.length})
          </button>
          <button className={`vendor-filter-btn ${orderFilter === "preparation" ? "active" : ""}`} onClick={() => setOrderFilter("preparation")}>
            À préparer ({countBy("preparation")})
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
            <div className="glyph">📬</div>
            <p>Aucune commande {orderFilter !== "all" ? "pour ce filtre" : "pour l'instant"}.</p>
          </div>
        ) : (
          filteredOrders.map((o) => (
            <div className="order-card" key={o.order_id}>
              <div className="order-head">
                <div>
                  <strong className="order-number">Commande #{o.order_id}</strong>
                  {o.created_at && (
                    <span className="order-date">
                      {new Date(o.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>
                <span className={`status-pill status-${o.delivery_status}`}>
                  {STATUS_LABELS[o.delivery_status] || o.delivery_status}
                </span>
              </div>

              {/* Articles de la commande */}
              <div className="order-items">
                {o.items.map((it) => (
                  <div className="order-item-row" key={it.item_id}>
                    <span className="order-item-name">{it.product_name}</span>
                    <span className="order-item-qty">×{it.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="order-meta">
                📍 {o.shipping_address} · 📞 {o.phone}
              </div>
              <div className="order-payment">
                {o.payment_method === "mobile_money" ? "📱 Mobile Money" : "💵 Paiement à la livraison"}
              </div>

              <div className="order-actions">
                {o.delivery_status === "preparation" && (
                  <button className="btn btn-primary" onClick={() => updateStatus(o.order_id, "shipped")}>
                    Marquer expédiée ➜
                  </button>
                )}
                {o.delivery_status === "shipped" && (
                  <button className="btn btn-primary" onClick={() => updateStatus(o.order_id, "delivered")}>
                    Marquer livrée ✓
                  </button>
                )}
                <button
                  className="btn btn-ghost"
                  onClick={() => handleContact(o.order_id)}
                  disabled={!shopId || contactingId === o.order_id}
                >
                  💬 {contactingId === o.order_id ? "..." : "Contacter"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <VendorBottomNav unreadMessages={unreadCount} />
    </div>
  );
}
