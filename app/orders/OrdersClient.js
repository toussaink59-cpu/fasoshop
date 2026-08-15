"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import SiteHeader from "@/app/components/SiteHeader";
import BottomNav from "@/app/components/BottomNav";

const STATUS_LABELS = {
  preparation: "En préparation",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
};

function OrdersContent({ initialUser, categories, initialOrders, confirmedId, confirmedMethod }) {
  const router = useRouter();
  // 🆕 Paramètre ?paid=XX : retour après un paiement Mobile Money réussi
  const searchParams = useSearchParams();
  const paidId = searchParams.get("paid");

  const [orders, setOrders] = useState(initialOrders);
  const [contactingKey, setContactingKey] = useState(null);
  const [confirmingKey, setConfirmingKey] = useState(null);
  const [payingKey, setPayingKey] = useState(null);
  const [error, setError] = useState("");
  const [orderFilter, setOrderFilter] = useState("all");

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

  async function handlePay(orderId) {
    setError("");
    setPayingKey(orderId);

    try {
      const res = await fetch(`/api/orders/${orderId}/pay`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur lors de l'initiation du paiement.");
        setPayingKey(null);
        return;
      }

      window.location.href = data.paymentUrl;
    } catch {
      setError("Impossible de contacter le service de paiement.");
      setPayingKey(null);
    }
  }

  async function handleConfirmReceipt(orderId, shopId) {
    const key = `${orderId}-${shopId}`;
    setError("");
    setConfirmingKey(key);

    const res = await fetch(`/api/orders/${orderId}/confirm-receipt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopId }),
    });
    const data = await res.json();
    setConfirmingKey(null);

    if (!res.ok) {
      setError(data.error || "Erreur lors de la confirmation.");
      return;
    }

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              subOrders: o.subOrders.map((s) =>
                s.shopId === shopId ? { ...s, deliveryStatus: "delivered" } : s
              ),
            }
          : o
      )
    );
  }

  const hasStatus = (o, s) => o.subOrders.some((sub) => sub.deliveryStatus === s);
  const filteredOrders =
    orderFilter === "all" ? orders : orders.filter((o) => hasStatus(o, orderFilter));
  const countBy = (s) => orders.filter((o) => hasStatus(o, s)).length;

  return (
    <div className="shell">
      <SiteHeader initialUser={initialUser} categories={categories} />
      <div className="orders-wrap">

        {/* 🆕 Bannière verte : paiement Mobile Money réussi */}
        {paidId && (
          <div className="order-confirm-banner" style={{ background: "#e8f5e9", borderColor: "#2e7d32" }}>
            <div className="order-confirm-icon">✅</div>
            <h2>Paiement réussi !</h2>
            <p>
              Merci ! Votre paiement Mobile Money de la commande #{paidId} a bien été reçu.
              Elle passe en préparation — vous serez notifié à chaque étape.
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

        {confirmedId && (
          <div className="order-confirm-banner">
            <div className="order-confirm-icon">🎉</div>
            <h2>Commande #{confirmedId} confirmée !</h2>
            <p>
              {confirmedMethod === "mobile_money"
                ? "Cliquez sur « Payer maintenant » ci-dessous pour finaliser votre paiement Mobile Money."
                : "Paiement à la livraison — nous vous contacterons au numéro fourni."}
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
          <span className="orders-count">{orders.length}</span>
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
          <>
            <div style={{ overflowX: "auto", maxWidth: "100%", WebkitOverflowScrolling: "touch" }}>
              <div className="vendor-filters" style={{ flexWrap: "nowrap", width: "max-content", maxWidth: "none" }}>
                <button className={`vendor-filter-btn ${orderFilter === "all" ? "active" : ""}`} onClick={() => setOrderFilter("all")}>
                  Toutes ({orders.length})
                </button>
                <button className={`vendor-filter-btn ${orderFilter === "preparation" ? "active" : ""}`} onClick={() => setOrderFilter("preparation")}>
                  En préparation ({countBy("preparation")})
                </button>
                <button className={`vendor-filter-btn ${orderFilter === "shipped" ? "active" : ""}`} onClick={() => setOrderFilter("shipped")}>
                  Expédiées ({countBy("shipped")})
                </button>
                <button className={`vendor-filter-btn ${orderFilter === "delivered" ? "active" : ""}`} onClick={() => setOrderFilter("delivered")}>
                  Livrées ({countBy("delivered")})
                </button>
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="empty-state">
                <div className="glyph">🔎</div>
                <p>Aucune commande pour ce filtre.</p>
              </div>
            ) : (
              filteredOrders.map((order) => (
                <div className="order-card" key={order.id}>
                  <div className="order-head">
                    <div>
                      <strong className="order-number">Commande #{order.id}</strong>
                      <span className="order-date">
                        {new Date(order.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
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

                  {order.payment_method === "mobile_money" && order.status === "pending" && (
                    <div className="order-actions" style={{ marginTop: 10 }}>
                      <button
                        className="btn btn-primary"
                        onClick={() => handlePay(order.id)}
                        disabled={payingKey === order.id}
                        style={{ width: "100%" }}
                      >
                        💳 {payingKey === order.id
                          ? "Redirection en cours..."
                          : `Payer maintenant (${Number(order.total).toLocaleString("fr-FR")} FCFA)`}
                      </button>
                    </div>
                  )}

                  {order.subOrders.map((sub) => {
                    const key = `${order.id}-${sub.shopId}`;
                    return (
                      <div className="order-sub" key={sub.shopId}>
                        <div className="order-sub-head">
                          {/* 🎯 SPRINT A : nom RÉEL de la boutique (plus de "Kimoxa" hardcodé) */}
                          <strong style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: "1.1rem" }}>🏪</span>
                            <span>{sub.shopName || "Boutique partenaire"}</span>
                            <span style={{ color: "var(--gold-600)", fontWeight: 700 }}>✓</span>
                          </strong>
                          <span className={`status-pill status-${sub.deliveryStatus}`}>
                            {STATUS_LABELS[sub.deliveryStatus] || sub.deliveryStatus}
                          </span>
                        </div>

                        <div className="order-items">
                          {sub.items.map((item, idx) => (
                            <div className="order-item-row" key={idx}>
                              <span className="order-item-name">
                                {item.quantity} × {item.productName}
                              </span>
                              <span className="order-item-qty">
                                {Number(item.priceAtPurchase * item.quantity).toLocaleString("fr-FR")} FCFA
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="order-actions">
                          <button
                            className="btn btn-ghost"
                            onClick={() => handleContact(order.id, sub.shopId)}
                            disabled={contactingKey === key}
                          >
                            💬 {contactingKey === key ? "Ouverture..." : "Contacter"}
                          </button>
                          <Link
                            href={`/orders/${order.id}/invoice`}
                            className="btn btn-ghost"
                          >
                            🧾 Facture
                          </Link>
                          {sub.deliveryStatus === "shipped" && (
                            <button
                              className="btn btn-success"
                              onClick={() => handleConfirmReceipt(order.id, sub.shopId)}
                              disabled={confirmingKey === key}
                            >
                              ✅ {confirmingKey === key ? "..." : "J'ai reçu"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </>
        )}
      </div>
      <BottomNav user={initialUser} />
    </div>
  );
}

// Enveloppe Suspense : obligatoire pour useSearchParams dans Next.js 15
export default function OrdersClient(props) {
  return (
    <Suspense fallback={<div className="shell"><div className="orders-wrap"><p>Chargement...</p></div></div>}>
      <OrdersContent {...props} />
    </Suspense>
  );
}