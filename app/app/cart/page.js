"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCart, updateQuantity, clearCart, cartTotal } from "@/lib/cart";

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState([]);
  const [shippingAddress, setShippingAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setCart(getCart());
  }, []);

  function changeQty(productId, qty) {
    updateQuantity(productId, qty);
    setCart(getCart());
  }

  async function handleCheckout(e) {
    e.preventDefault();
    setError("");

    const meRes = await fetch("/api/auth/me");
    const me = await meRes.json();
    if (!me.user) {
      router.push("/login");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        shippingAddress,
        phone,
        paymentMethod,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Erreur lors de la commande.");
      setSubmitting(false);
      return;
    }

    clearCart();
    router.push(`/orders?confirmed=${data.order.id}&method=${paymentMethod}`);
  }

  const total = cartTotal(cart);

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
          <h1>Mon panier</h1>
        </div>

        {error && <div className="error-box">{error}</div>}

        {cart.length === 0 ? (
          <div className="empty-state">
            <div className="glyph">🛒</div>
            <p>Votre panier est vide.</p>
            <Link href="/shop"><button className="btn btn-primary" style={{ marginTop: 10 }}>Voir le catalogue</button></Link>
          </div>
        ) : (
          <>
            <div className="panel">
              {cart.map((item) => (
                <div className="cart-item" key={item.productId}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--ink-400)" }}>{item.shopName}</div>
                  </div>
                  <div className="qty-stepper">
                    <button onClick={() => changeQty(item.productId, item.quantity - 1)}>−</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => changeQty(item.productId, item.quantity + 1)}>+</button>
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", minWidth: 90, textAlign: "right" }}>
                    {(item.price * item.quantity).toLocaleString("fr-FR")} FCFA
                  </div>
                </div>
              ))}
              <div style={{ textAlign: "right", marginTop: 14, fontSize: "1.15rem", fontWeight: 700 }}>
                Total : {total.toLocaleString("fr-FR")} FCFA
              </div>
            </div>

            <div className="panel">
              <h2>Livraison</h2>
              <form onSubmit={handleCheckout}>
                <label htmlFor="address">Adresse de livraison</label>
                <input
                  id="address"
                  required
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Ex : Secteur 15, Ouagadougou"
                />
                <br /><br />
                <label htmlFor="phone">Numéro de téléphone</label>
                <input
                  id="phone"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ex : 70 00 00 00"
                />
                <br /><br />
                <label>Mode de paiement</label>
                <div className="payment-options">
                  <label className={`payment-option ${paymentMethod === "cod" ? "selected" : ""}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={paymentMethod === "cod"}
                      onChange={() => setPaymentMethod("cod")}
                    />
                    <div>
                      <div className="payment-option-title">💵 Payer à la livraison</div>
                      <div className="payment-option-desc">Vous réglez en espèces au moment de recevoir votre commande.</div>
                    </div>
                  </label>
                  <label className={`payment-option ${paymentMethod === "mobile_money" ? "selected" : ""}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="mobile_money"
                      checked={paymentMethod === "mobile_money"}
                      onChange={() => setPaymentMethod("mobile_money")}
                    />
                    <div>
                      <div className="payment-option-title">📱 Payer maintenant (Orange Money / Moov Money)</div>
                      <div className="payment-option-desc">
                        Le paiement automatique arrive bientôt. Pour l'instant, la boutique vous contactera au numéro fourni pour finaliser le transfert.
                      </div>
                    </div>
                  </label>
                </div>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Validation..." : "Valider la commande"}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
