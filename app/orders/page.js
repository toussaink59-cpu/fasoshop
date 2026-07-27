"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const STATUS_LABELS = {
  preparation: "En préparation",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
};

function OrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const confirmedId = searchParams.get("confirmed");
  const confirmedMethod = searchParams.get("method");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/orders").then(async (res) => {
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      setOrders(data.orders || []);
      setLoading(false);
    });
  }, [router]);

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/shop" className="brand" style={{ textDecoration: "none" }}>
          🛒 FasoShop
        </Link>
      </div>
      <div className="woven-strip" />
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
        {loading ? (
          <p>Chargement...</p>
        ) : orders.length === 0 ? (
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
              {order.subOrders.map((sub) => (
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
                </div>
              ))}

              <div style={{ textAlign: "right", fontWeight: 700, marginTop: 8 }}>
                Total : {Number(order.total).toLocaleString("fr-FR")} FCFA
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="shell"><div className="content"><p>Chargement...</p></div></div>}>
      <OrdersContent />
    </Suspense>
  );
}
