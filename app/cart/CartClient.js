"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCart, updateQuantity, clearCart, cartTotal } from "@/lib/cart";
import { getDeliveryFee, formatDeliveryFee, freeDeliveryHint } from "@/lib/delivery";
import SiteHeader from "@/app/components/SiteHeader";
import BottomNav from "@/app/components/BottomNav";

export default function CartClient({ initialUser, categories }) {
  const router = useRouter();
  const [cart, setCart] = useState(() => (typeof window !== "undefined" ? getCart() : []));
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setCart(getCart());
  }, []);

  useEffect(() => {
    if (!initialUser) return;
    fetch("/api/addresses").then(async (res) => {
      if (!res.ok) return;
      const data = await res.json();
      const addresses = data.addresses || [];
      setSavedAddresses(addresses);

      const defaultAddress = addresses.find((a) => a.par_defaut) || addresses[0];
      if (defaultAddress) {
        setSelectedAddressId(String(defaultAddress.id));
        setShippingAddress(defaultAddress.adresse_texte);
        if (defaultAddress.phone) setPhone(defaultAddress.phone);
      }
    });
  }, [initialUser]);

  function changeQty(productId, qty) {
    updateQuantity(productId, qty);
    setCart(getCart());
  }

  function removeItem(productId) {
    updateQuantity(productId, 0);
    setCart(getCart());
  }

  function handleAddressSelect(value) {
    setSelectedAddressId(value);
    if (value === "custom") {
      setShippingAddress("");
      return;
    }
    const addr = savedAddresses.find((a) => String(a.id) === value);
    if (addr) {
      setShippingAddress(addr.adresse_texte);
      if (addr.phone) setPhone(addr.phone);
    }
  }

  // ===== CALCULS LIVRAISON =====
  const subtotal = cartTotal(cart);
  // Détecte la ville depuis l'adresse saisie (Ouagadougou = 1 500, sinon 2 500)
  const detectedCity = useMemo(() => {
    const addr = (shippingAddress || "").toLowerCase();
    if (addr.includes("ouaga") || addr.includes("kadiogo")) return "Ouagadougou";
    return shippingAddress ? "Autre" : "";
  }, [shippingAddress]);
  const deliveryFee = getDeliveryFee(detectedCity, subtotal);
  const grandTotal = subtotal + deliveryFee;
  const freeHint = freeDeliveryHint(subtotal);

  async function handleCheckout(e) {
    e.preventDefault();
    setError("");

    const meRes = await fetch("/api/auth/me");
    const me = await meRes.json();
    if (!me.user) {
      router.push("/login");
      return;
    }

    if (!shippingAddress.trim()) {
      setError("Merci d'indiquer une adresse de livraison.");
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
        deliveryFee, // envoyé au serveur pour enregistrement
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

  return (
    <div className="shell">
      <SiteHeader initialUser={initialUser} categories={categories} />

      <div className="cart-wrap">
        <div className="cart-header">
          <h1>Mon panier</h1>
          <span className="cart-count">{cart.length} article{cart.length > 1 ? "s" : ""}</span>
        </div>

        {error && <div className="error-box">{error}</div>}

        {cart.length === 0 ? (
          <div className="empty-state">
            <div className="glyph">🛒</div>
            <p>Votre panier est vide.</p>
            <Link href="/shop">
              <button className="btn btn-primary" style={{ marginTop: 10 }}>Voir le catalogue</button>
            </Link>
          </div>
        ) : (
          <>
            {/* Liste des articles */}
            <div className="cart-items-list">
              {cart.map((item) => (
                <div className="cart-item-card" key={item.productId}>
                  <div className="cart-item-image">
                    {item.image ? (
                      <img src={item.image} alt={item.name} />
                    ) : (
                      <div className="cart-item-placeholder">📦</div>
                    )}
                  </div>
                  <div className="cart-item-details">
                    <Link href={`/shop/${item.productId}`} className="cart-item-name">
                      {item.name}
                    </Link>
                    <div className="cart-item-shop">{item.shopName}</div>
                    <div className="cart-item-price">
                      {item.price.toLocaleString("fr-FR")} FCFA
                    </div>
                    <div className="cart-item-actions">
                      <div className="qty-stepper">
                        <button onClick={() => changeQty(item.productId, item.quantity - 1)}>−</button>
                        <span>{item.quantity}</span>
                        <button onClick={() => changeQty(item.productId, item.quantity + 1)}>+</button>
                      </div>
                      <button
                        className="cart-item-remove"
                        onClick={() => removeItem(item.productId)}
                      >
                        🗑️ Supprimer
                      </button>
                    </div>
                  </div>
                  <div className="cart-item-subtotal">
                    {(item.price * item.quantity).toLocaleString("fr-FR")} FCFA
                  </div>
                </div>
              ))}
            </div>

            {/* Bandeau "Plus que X FCFA pour livraison gratuite" (style Temu) */}
            {freeHint && (
              <div
                style={{
                  background: "#fef3c7",
                  border: "1px solid #fbbf24",
                  color: "#92400e",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  textAlign: "center",
                  marginBottom: "16px",
                }}
              >
                🚚 {freeHint}
              </div>
            )}

            {/* Formulaire de livraison */}
            <div className="cart-checkout-section">
              <h2>Livraison et paiement</h2>
              <form onSubmit={handleCheckout}>
                {savedAddresses.length > 0 && (
                  <div className="form-group">
                    <label htmlFor="saved-address">Adresse enregistrée</label>
                    <select
                      id="saved-address"
                      value={selectedAddressId}
                      onChange={(e) => handleAddressSelect(e.target.value)}
                    >
                      {savedAddresses.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.libelle}{a.par_defaut ? " (par défaut)" : ""}
                        </option>
                      ))}
                      <option value="custom">Autre adresse...</option>
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="address">Adresse de livraison</label>
                  <input
                    id="address"
                    required
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="Ex : Secteur 15, Ouagadougou"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phone">Numéro de téléphone</label>
                  <input
                    id="phone"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ex : 70 00 00 00"
                  />
                </div>

                {/* ===== RÉCAP LIVRAISON ===== */}
                {shippingAddress && (
                  <div
                    style={{
                      background: "#faf7f2",
                      border: "1px dashed var(--border)",
                      borderRadius: "10px",
                      padding: "12px 14px",
                      marginBottom: "16px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.85rem",
                        marginBottom: "6px",
                        color: "var(--ink-700)",
                      }}
                    >
                      <span>Sous-total ({cart.length} article{cart.length > 1 ? "s" : ""})</span>
                      <strong>{subtotal.toLocaleString("fr-FR")} FCFA</strong>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.85rem",
                        marginBottom: "8px",
                        color: "var(--ink-700)",
                      }}
                    >
                      <span>🚚 Livraison ({detectedCity || "—"})</span>
                      <strong style={{ color: deliveryFee === 0 ? "var(--millet-600)" : "var(--ink-900)" }}>
                        {formatDeliveryFee(deliveryFee)}
                      </strong>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingTop: "8px",
                        borderTop: "1px solid var(--border)",
                      }}
                    >
                      <span style={{ fontWeight: 700, color: "var(--ink-900)" }}>Total à payer</span>
                      <strong style={{ fontSize: "1.1rem", color: "var(--ink-900)" }}>
                        {grandTotal.toLocaleString("fr-FR")} FCFA
                      </strong>
                    </div>
                  </div>
                )}

                <div className="form-group">
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
                    <label className="payment-option" style={{ opacity: 0.5, cursor: "not-allowed" }}>
                      <input type="radio" name="paymentMethod" value="mobile_money" disabled />
                      <div>
                        <div className="payment-option-title">📱 Payer maintenant (Orange Money / Moov Money)</div>
                        <div className="payment-option-desc">Bientôt disponible — revenez rapidement !</div>
                      </div>
                    </label>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary cart-checkout-btn" disabled={submitting || !shippingAddress}>
                  {submitting ? "Validation..." : `Valider la commande (${grandTotal.toLocaleString("fr-FR")} FCFA)`}
                </button>
              </form>
            </div>

            {/* Total sticky mobile (mis à jour avec livraison) */}
            <div className="cart-sticky-total">
              <div className="cart-sticky-label">Total</div>
              <div className="cart-sticky-price">{grandTotal.toLocaleString("fr-FR")} FCFA</div>
              <button
                className="btn btn-primary"
                onClick={() => window.scrollTo({ top: document.querySelector(".cart-checkout-section").offsetTop, behavior: "smooth" })}
              >
                Commander
              </button>
            </div>
          </>
        )}
      </div>
      <BottomNav user={initialUser} />
    </div>
  );
}