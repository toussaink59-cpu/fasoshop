"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SiteHeader from "@/app/components/SiteHeader";
import BottomNav from "@/app/components/BottomNav";

const STATUS_LABELS = {
  preparation: "En préparation",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
};

export default function OrdersClient({ initialUser, categories, initialOrders, confirmedId, confirmedMethod }) {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);
  const [contactingKey, setContactingKey] = useState(null);
  const [error, setError] = useState("");

  async function handleContact(orderId, shopId) {
    const key = `${orderId}-${shopId}`;
    setError("");
    setContactingKey(key);

    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, shopId }),
    });
    const data = await res.json();
    setContactingKey(null);

    if (!res.ok) {
      setError(data.error || "Erreur lors de l'ouverture de la conversation.");
      return;
    }

    router.push(`/messages/${data.conversationId}`);
  }

  return (
    <div className="shell">
      <SiteHeader initialUser={initialUser} categories={categories} />
      <div className="orders-wrap">

        {/* 🎉 Grande bannière de confirmation */}
        {confirmedId && (
          <div className="order-confirm-banner">
            <div className="order-confirm-icon">🎉</div>
            <h2>Commande #{confirmedId} confirmée !</h2>
            <p>
              {confirmedMethod === "mobile_money"
                ? "La boutique va vous contacter au numéro fourni pour finaliser le paiement Mobile Money."
                : "Paiement à la livraison — vous serez contacté au numéro fourni."}
            </p>
            <div className="order-steps">
              <div className="order-step is-active">
                <span className="order-step-dot">📦</span>
                En préparation
              </div>
              <div className="order-step-line" />
              <div className="order-step">
                <span className="order-step-dot">🚚</span>
                Expédiée
              </div>
              <div className="order-step-line" />
              <div className="order-step">
                <span className="order-step-dot">✅</span>
                Livrée
              </div>
            </div>
          </div>
        )}

        <div className="orders-header">
          <h1>Mes commandes</h1>
          <span className="orders-count">
            {orders.length} commande{orders.length > 1 ? "s" : ""}
          </span>
        </div>

        {error && <div className="error-box">{error}</div>}

        {orders.length === 0 ? (
          <div className="empty-state">
            <div className="glyph">📦</div>
            <p>Vous n'avez pas encore passé de commande.</p>
            <Link href="/shop">
              <button className="btn btn-primary" style={{ marginTop: 10 }}>Voir le catalogue</button>
            </Link>
          </div>
        ) : (
          orders.map((order) => (
            <div className="order-card" key={order.id}>
              <div className="order-head">
                <div>
                  <strong className="order-number">Commande #{order.id}</strong>
                  <span className="order-date">
                    {new Date(order.created_at).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                <span className="order-total">
                  {Number(order.total).toLocaleString("fr-FR")} FCFA
                </span>
              </div>

              <div className="order-meta">
                📍 {order.shipping_address}
                {" · "}
                {order.payment_method === "mobile_money" ? "📱 Mobile Money" : "💵 À la livraison"}
              </div>

              {/* Une sous-commande par boutique, avec son propre statut */}
              {order.subOrders.map((sub) => {
                const key = `${order.id}-${sub.shopId}`;
                return (
                  <div className="order-sub" key={sub.shopId}>
                    <div className="order-sub-head">
                      <strong>{sub.shopName}</strong>
                      <span className={`status-pill status-${sub.deliveryStatus}`}>
                        {STATUS_LABELS[sub.deliveryStatus] || sub.deliveryStatus}
                      </span>
                    </div>
                    <div className="order-sub-items">
                      {sub.items.map((item, idx) => (
                        <div key={idx}>
                          <span>{item.quantity} × {item.productName}</span>
                          <span>{Number(item.priceAtPurchase * item.quantity).toLocaleString("fr-FR")} FCFA</span>
                        </div>
                      ))}
                    </div>
                    <button
                      className="btn btn-ghost order-contact-btn"
                      onClick={() => handleContact(order.id, sub.shopId)}
                      disabled={contactingKey === key}
                    >
                      💬 {contactingKey === key ? "Ouverture..." : "Contacter le vendeur"}
                    </button>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
      <BottomNav user={initialUser} />
    </div>
  );
}
