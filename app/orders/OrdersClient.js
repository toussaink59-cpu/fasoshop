"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import SiteHeader from "@/app/components/SiteHeader";
import BottomNav from "@/app/components/BottomNav";
import { PackageIcon, TruckIcon, CheckCircleIcon, MessageIcon, CreditCardIcon,
  MapPinIcon, SmartphoneIcon, StoreIcon, BadgeCheckIcon, SearchIcon } from "@/app/components/Icons";

const STATUS_LABELS = {
  preparation: "En préparation",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
};

const StatusIcon = ({ status, size = 16 }) => {
  if (status === "preparation") return <PackageIcon size={size} />;
  if (status === "shipped") return <TruckIcon size={size} />;
  if (status === "delivered") return <CheckCircleIcon size={size} />;
  return null;
};

function OrdersContent({ initialUser, categories, initialOrders, confirmedId, confirmedMethod }) {
  const router = useRouter();
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

        {paidId && (
          <div className="order-confirm-banner" style={{ background: "#e8f5e9", borderColor: "#2e7d32" }}>
            <div className="order-confirm-icon" style={{ color: "#2e7d32", display: "inline-flex" }}><CheckCircleIcon size={32} /></div>
            <h2>Paiement réussi !</h2>
            <p>
              Merci ! Votre paiement Mobile Money de la commande #{paidId} a bien été reçu.
              Elle passe en préparation — vous serez notifié à chaque étape.
            </p>
            <div className="order-steps">
              <div className="order-step is-active">
                <span className="order-step-dot"><PackageIcon size={18} /></span>
                En préparation
              </div>
              <div className="order-step-line" />
              <div className="order-step">
                <span className="order-step-dot"><TruckIcon size={18} /></span>
                Expédiée
              </div>
              <div className="order-step-line" />
              <div className="order-step">
                <span className="order-step-dot"><CheckCircleIcon size={18} /></span>
                Livrée
              </div>
            </div>
          </div>
        )}

        {confirmedId && (
          <div className="order-confirm-banner">
            <div className="order-confirm-icon" style={{ color: "var(--gold-600)", display: "inline-flex" }}><CheckCircleIcon size={32} /></div>
            <h2>Commande #{confirmedId} confirmée !</h2>
            <p>
              {confirmedMethod === "mobile_money"
                ? "Cliquez sur « Payer maintenant » ci-dessous pour finaliser votre paiement Mobile Money."
                : "Paiement à la livraison — nous vous contacterons au numéro fourni."}
            </p>
            <div className="order-steps">
              <div className="order-step is-active">
                <span className="order-step-dot"><PackageIcon size={18} /></span>
                En préparation
              </div>
              <div className="order-step-line" />
              <div className="order-step">
                <span className="order-step-dot"><TruckIcon size={18} /></span>
                Expédiée
              </div>
              <div className="order-step-line" />
              <div className="order-step">
                <span className="order-step-dot"><CheckCircleIcon size={18} /></span>
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
            <div className="glyph" style={{ display: "inline-flex", color: "var(--gold-600)" }}><PackageIcon size={48} /></div>
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
                <div className="glyph" style={{ display: "inline-flex", color: "var(--ink-400)" }}><SearchIcon size={48} /></div>
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

                  <div className="order-meta" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, fontSize: "0.85rem" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <MapPinIcon size={14} /> {order.shipping_address}
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      {order.payment_method === "mobile_money" ? <><SmartphoneIcon size={14} /> Mobile Money</> : <><CreditCardIcon size={14} /> À la livraison</>}
                    </span>
                  </div>

                  {order.payment_method === "mobile_money" && order.status === "pending" && (
                    <div className="order-actions" style={{ marginTop: 10 }}>
                      <button
                        className="btn btn-primary"
                        onClick={() => handlePay(order.id)}
                        disabled={payingKey === order.id}
                        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                      >
                        <CreditCardIcon size={16} />
                        {payingKey === order.id
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
                          <strong style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <StoreIcon size={18} />
                            <span>{sub.shopName || "Boutique partenaire"}</span>
                            <span style={{ color: "var(--gold-600)", display: "inline-flex" }}><BadgeCheckIcon size={16} /></span>
                          </strong>
                          <span className={`status-pill status-${sub.deliveryStatus}`} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <StatusIcon status={sub.deliveryStatus} size={12} />
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

                        <div className="order-actions" style={{ marginTop: 12 }}>
                          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                            <Link
                              href={`/orders/${order.id}/invoice`}
                              className="btn btn-primary"
                              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                            >
                               Facture
                            </Link>
                            {sub.deliveryStatus === "shipped" && (
                              <button
                                className="btn btn-success"
                                onClick={() => handleConfirmReceipt(order.id, sub.shopId)}
                                disabled={confirmingKey === key}
                                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                              >
                                <CheckCircleIcon size={16} /> {confirmingKey === key ? "..." : "J'ai reçu"}
                              </button>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: 12, fontSize: "0.85rem" }}>
                            <button
                              onClick={() => handleContact(order.id, sub.shopId)}
                              disabled={contactingKey === key}
                              style={{
                                background: "none", border: "none", padding: 0,
                                color: "var(--gold-700)", cursor: "pointer",
                                display: "inline-flex", alignItems: "center", gap: 4,
                                textDecoration: "underline",
                              }}
                            >
                              <MessageIcon size={14} /> {contactingKey === key ? "Ouverture..." : "Contacter le vendeur"}
                            </button>
                          </div>
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

export default function OrdersClient(props) {
  return (
    <Suspense fallback={<div className="shell"><div className="orders-wrap"><p>Chargement...</p></div></div>}>
      <OrdersContent {...props} />
    </Suspense>
  );
}
