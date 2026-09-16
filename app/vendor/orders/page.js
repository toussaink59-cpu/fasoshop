"use client";

// app/vendor/orders/page.js — RÉÉCRITURE PRO
// Design system : app/dashboard.css.
// API inchangées : GET /api/vendor/orders · PATCH /api/vendor/orders/[id]
//                  GET /api/vendor/shop · POST /api/conversations

import { MessageCircleIcon, LockIcon, MailIcon, MapPinIcon, PhoneIcon, SmartphoneIcon, CheckCircleIcon, ArrowRightIcon, XCircleIcon, BanknoteIcon, PackageIcon, WalletIcon } from "@/app/components/Icons";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import VendorBottomNav from "@/app/components/VendorBottomNav";
import KimoxaLogo from "@/app/components/KimoxaLogo";
import "../../dashboard.css";

const STATUS_LABELS = {
  preparation: "En préparation",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
};
const STATUS_CLS = {
  preparation: "status-preparation",
  shipped: "status-shipped",
  delivered: "status-delivered",
  cancelled: "status-cancelled",
};

const fmtAmount = (n) => `${Number(n || 0).toLocaleString("fr-FR")} FCFA`;
const fmtDate = (d) =>
  new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

// Total d'une commande : les lignes portent price_at_purchase (order_items).
// Fallback défensif si l'API ne le renvoie pas (total masqué, jamais de NaN).
function orderTotal(order) {
  let total = 0;
  let hasPrice = false;
  for (const it of order.items) {
    const p = Number(it.price_at_purchase ?? it.price);
    if (Number.isFinite(p) && p > 0) { total += p * it.quantity; hasPrice = true; }
  }
  return hasPrice ? total : null;
}

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
    if (res.status === 401 || res.status === 403) { router.push("/login"); return; }
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
    fetch("/api/vendor/shop").then((r) => r.json()).then((d) => setShopId(d.shop?.id || null));
  }, [load]);

  useEffect(() => {
    function loadUnread() {
      fetch("/api/conversations/unread-count").then((r) => r.json()).then((d) => setUnreadCount(d.unread || 0));
    }
    loadUnread();
    const timer = setInterval(loadUnread, 15000);
    return () => clearInterval(timer);
  }, []);

  async function updateStatus(orderId, status, reason) {
    setError("");
    const res = await fetch(`/api/vendor/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reason }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Erreur lors de la mise à jour."); return; }
    load();
  }

  async function handleCancel(orderId) {
    if (!window.confirm("Annuler cette commande ? Les produits seront remis en stock et la commission annulée. Action irréversible.")) return;
    await updateStatus(orderId, "cancelled", "vendor_cancel_preparation");
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
    if (!res.ok) { setError(data.error || "Erreur lors de l'ouverture de la conversation."); return; }
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
    return [...map.values()].sort((a, b) => Number(b.order_id) - Number(a.order_id));
  }, [items]);

  const filteredOrders = orderFilter === "all" ? orders : orders.filter((o) => o.delivery_status === orderFilter);
  const countBy = (s) => orders.filter((o) => o.delivery_status === s).length;
  const toPrepare = countBy("preparation");
  const pendingRevenue = orders.filter((o) => o.delivery_status === "preparation").reduce((s, o) => s + (orderTotal(o) || 0), 0);

  return (
    <div>
      <div className="dash-topbar">
        <div className="dash-topbar-brand">
          <KimoxaLogo light size={20} />
          <span className="dash-topbar-role">Vendeur</span>
        </div>
        <div className="dash-topbar-actions">
          <Link href="/messages" className="tb-btn" aria-label="Messages">
            <MessageCircleIcon size={18} />
            {unreadCount > 0 && <span className="tb-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
          </Link>
          <Link href="/vendor/dashboard" className="tb-link">Mon stock</Link>
        </div>
      </div>
      <div className="woven-strip" />

      <div className="dash-wrap">
        <div className="dash-head">
          <div>
            <h1 className="dash-title">Commandes reçues</h1>
            <p className="dash-sub">Le statut concerne uniquement votre boutique.</p>
          </div>
        </div>

        <div className="chip-row">
          <span className="chip-stat"><PackageIcon size={16} /> <strong>{orders.length}</strong> commandes</span>
          <span className="chip-stat"><CheckCircleIcon size={16} /> <strong>{toPrepare}</strong> à préparer</span>
          {pendingRevenue > 0 && (
            <span className="chip-stat"><WalletIcon size={16} /> <strong>{fmtAmount(pendingRevenue)}</strong> en préparation</span>
          )}
        </div>

        <div className="panel" style={{ marginBottom: 16, background: "var(--info-soft)", borderColor: "transparent" }}>
          <div className="panel-body" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.85rem", color: "var(--info)" }}>
            <LockIcon size={16} />
            <span>Règle Kimoxa : vous marquez « Expédiée », <strong>le client confirme la réception</strong>. Le paiement vous est libéré après confirmation client (Mobile Money) ou selon votre reversement (espèces).</span>
          </div>
        </div>

        {error && <div className="error-box">{error}</div>}

        <div className="ftabs">
          <button className={`ftab ${orderFilter === "all" ? "active" : ""}`} onClick={() => setOrderFilter("all")}>
            Toutes <span className="ftab-count">{orders.length}</span>
          </button>
          <button className={`ftab ${orderFilter === "preparation" ? "active" : ""}`} onClick={() => setOrderFilter("preparation")}>
            À préparer <span className="ftab-count">{countBy("preparation")}</span>
          </button>
          <button className={`ftab ${orderFilter === "shipped" ? "active" : ""}`} onClick={() => setOrderFilter("shipped")}>
            Expédiées <span className="ftab-count">{countBy("shipped")}</span>
          </button>
          <button className={`ftab ${orderFilter === "delivered" ? "active" : ""}`} onClick={() => setOrderFilter("delivered")}>
            Livrées <span className="ftab-count">{countBy("delivered")}</span>
          </button>
          <button className={`ftab ${orderFilter === "cancelled" ? "active" : ""}`} onClick={() => setOrderFilter("cancelled")}>
            Annulées <span className="ftab-count">{countBy("cancelled")}</span>
          </button>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[0, 1, 2].map((i) => <div key={i} className="skeleton" />)}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="empty-block">
            <MailIcon size={48} />
            <p>Aucune commande {orderFilter !== "all" ? "pour ce filtre" : "pour l'instant"}.</p>
          </div>
        ) : (
          filteredOrders.map((o) => {
            const total = orderTotal(o);
            return (
              <div className={`order-card-pro ${o.delivery_status === "preparation" ? "order-card-pro--attention" : ""}`} key={o.order_id}>
                <div className="oc-head">
                  <div>
                    <span className="oc-number">Commande #{o.order_id}</span>
                    {o.created_at && <span className="oc-date">{fmtDate(o.created_at)}</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className={`status-pill ${STATUS_CLS[o.delivery_status] || "status-preparation"}`}>
                      {STATUS_LABELS[o.delivery_status] || o.delivery_status}
                    </span>
                    {total !== null && <span className="oc-amount">{fmtAmount(total)}</span>}
                  </div>
                </div>

                <div className="oc-items">
                  {o.items.map((it) => (
                    <div className="oc-item" key={it.item_id}>
                      <span className="oc-item-name">{it.product_name}</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        {(it.price_at_purchase || it.price) && (
                          <span className="oc-item-price">
                            {fmtAmount(Number(it.price_at_purchase ?? it.price) * it.quantity)}
                          </span>
                        )}
                        <span className="oc-qty">×{it.quantity}</span>
                      </span>
                    </div>
                  ))}
                </div>

                <div className="oc-meta">
                  {o.shipping_address && (
                    <span><MapPinIcon size={14} /> {o.shipping_address}</span>
                  )}
                  {o.phone && (
                    <span><PhoneIcon size={14} /> {o.phone}</span>
                  )}
                  <span>
                    {o.payment_method === "mobile_money"
                      ? <><SmartphoneIcon size={14} /> Mobile Money</>
                      : <><BanknoteIcon size={14} /> Paiement à la livraison</>}
                  </span>
                </div>

                <div className="oc-actions">
                  {o.delivery_status === "preparation" && (
                    <>
                      <button className="btn btn-primary" onClick={() => updateStatus(o.order_id, "shipped", "vendor_ship")}>
                        Marquer expédiée <ArrowRightIcon size={16} style={{ marginLeft: 4 }} />
                      </button>
                      <button className="btn btn-ghost" onClick={() => handleCancel(o.order_id)}>
                        <XCircleIcon size={16} style={{ marginRight: 4 }} /> Annuler (restock)
                      </button>
                    </>
                  )}
                  {o.delivery_status === "shipped" && (
                    <span className="oc-hint">
                      <SmartphoneIcon size={16} /> Colis en route — en attente de confirmation du client.
                    </span>
                  )}
                  <button
                    className="btn btn-ghost"
                    onClick={() => handleContact(o.order_id)}
                    disabled={!shopId || contactingId === o.order_id}
                  >
                    <MessageCircleIcon size={18} /> {contactingId === o.order_id ? "..." : "Contacter"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
      <VendorBottomNav unreadMessages={unreadCount} />
    </div>
  );
}