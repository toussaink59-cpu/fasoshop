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
      <div className="content">
        <div className="page-header">
          <h1>Mes commandes</h1>
        </div>
        {confirmedId && (
          <div className="success-box">
            ✅ Commande #{confirmedId} confirmée !{" "}
            {confirmedMethod === "mobile_money"
              ? "La boutique va vous contacter au numéro fourni pour finaliser le paiement Mobile Money."
              : "Paiement à la livraison — vous serez contacté au numéro fourni."}
          </div>
        )}
        {error && <div className="error-box">{error}</div>}
        {orders.length === 0 ? (
          <div className="empty-state">
            <div className="glyph">📦</div>
            <p>Vous n'avez pas encore passé de commande.</p>
            <Link href="/shop"><button className="btn btn-primary" style={{ marginTop: 10 }}>Voir le catalogue</button></Link>
          </div>
        ) : (
          orders.map((order) => (
            <div className="order-card" key={order.id}>
              <div className="order-head">
                <strong>Commande #{order.id}</strong>
                <span style={{ fontSize: "0.85rem", color: "var(--ink-400)" }}>
                  {new Date(order.created_at).toLocaleDateString("fr-FR")}
                </span>
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--ink-400)", marginBottom: 12 }}>
                Livraison : {order.shipping_address}
                {" · "}{order.payment_method === "mobile_money" ? "📱 Mobile Money" : "💵 À la livraison"}
              </div>

              {/* Une sous-commande par boutique, chacune avec son propre statut de livraison */}
              {order.subOrders.map((sub) => {
                const key = `${order.id}-${sub.shopId}`;
                return (
                  <div
                    key={sub.shopId}
                    style={{
                      border: "1px solid var(--sand-200)",
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 10,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <strong style={{ fontSize: "0.9rem" }}>{sub.shopName}</strong>
                      <span className={`status-pill status-${sub.deliveryStatus}`}>
                        {STATUS_LABELS[sub.deliveryStatus] || sub.deliveryStatus}
                      </span>
                    </div>
                    {sub.items.map((item, idx) => (
                      <div key={idx} style={{ fontSize: "0.9rem", display: "flex", justifyContent: "space-between" }}>
                        <span>{item.quantity} × {item.productName}</span>
                        <span>{Number(item.priceAtPurchase * item.quantity).toLocaleString("fr-FR")} FCFA</span>
                      </div>
                    ))}
                    <button
                      className="btn btn-ghost"
                      style={{ marginTop: 8, fontSize: "0.8rem" }}
                      onClick={() => handleContact(order.id, sub.shopId)}
                      disabled={contactingKey === key}
                    >
                      💬 {contactingKey === key ? "Ouverture..." : "Contacter le vendeur"}
                    </button>
                  </div>
                );
              })}

              <div style={{ textAlign: "right", fontWeight: 700, marginTop: 8 }}>
                Total : {Number(order.total).toLocaleString("fr-FR")} FCFA
              </div>
            </div>
          ))
        )}
      </div>
      <BottomNav user={initialUser} />
    </div>
  );
}
