"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
  const [deliveryMethod, setDeliveryMethod] = useState("delivery"); // 🚚 ou 🏪
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState("");
  // 🎁 Code promo
  const [promoCode, setPromoCode] = useState("");
  const [promoResult, setPromoResult] = useState(null);
  const [promoError, setPromoError] = useState("");
  const [promoValidating, setPromoValidating] = useState(false);

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

  // 📍 Géolocalisation gratuite via OpenStreetMap (pas de clé Google)
  async function useMyLocation() {
    setLocError("");
    if (!("geolocation" in navigator)) {
      setLocError("Géolocalisation non supportée par ce navigateur.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=fr`
          );
          const data = await res.json();
          if (data && data.display_name) {
            setShippingAddress(data.display_name.split(",").slice(0, 4).join(",").trim());
          } else {
            setShippingAddress(`Position GPS : ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          }
        } catch {
          setLocError("Conversion GPS impossible. Saisissez l'adresse manuellement.");
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocError("Autorisez la localisation, ou saisissez l'adresse manuellement.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // ===== CALCULS LIVRAISON / RETRAIT / PROMO =====
  const subtotal = cartTotal(cart);
  const detectedCity = useMemo(() => {
    const addr = (shippingAddress || "").toLowerCase();
    if (addr.includes("ouaga") || addr.includes("kadiogo")) return "Ouagadougou";
    return shippingAddress ? "Autre" : "";
  }, [shippingAddress]);
  const deliveryFee = getDeliveryFee(detectedCity, subtotal, deliveryMethod);
  const discount = promoResult ? promoResult.discount : 0;
  const grandTotal = Math.max(0, subtotal + deliveryFee - discount);
  const freeHint = freeDeliveryHint(subtotal, deliveryMethod);

  // 🎁 Validation code promo (debounce 500ms après dernière frappe)
  useEffect(() => {
    const code = promoCode.trim().toUpperCase();
    if (!code) {
      setPromoResult(null);
      setPromoError("");
      return;
    }
    const timer = setTimeout(async () => {
      setPromoValidating(true);
      setPromoError("");
      try {
        const res = await fetch("/api/promo-codes/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, amount: subtotal }),
        });
        const data = await res.json();
        if (data.valid) {
          setPromoResult(data);
        } else {
          setPromoResult(null);
          setPromoError(data.error || "Code invalide.");
        }
      } catch {
        setPromoError("Erreur de validation du code.");
      } finally {
        setPromoValidating(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [promoCode, subtotal]);

  async function handleCheckout(e) {
    e.preventDefault();
    setError("");

    const meRes = await fetch("/api/auth/me");
    const me = await meRes.json();
    if (!me.user) {
      router.push("/login");
      return;
    }

    if (deliveryMethod === "delivery" && !shippingAddress.trim()) {
      setError("Merci d'indiquer une adresse de livraison.");
      return;
    }
    if (!phone.trim()) {
      setError("Merci d'indiquer un numéro de téléphone.");
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
        deliveryMethod, // le serveur recalcule lui-même les frais
        promoCode: promoCode.trim().toUpperCase() || null, // 🎁
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
                      <Image src={item.image} alt={item.name} width={96} height={96} loading="lazy" />
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

            {/* Bandeau "Plus que X FCFA pour livraison gratuite" (masqué en mode retrait) */}
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
              <h2>Réception et paiement</h2>
              <form onSubmit={handleCheckout}>
                {/* ===== CHOIX : LIVRAISON ou RETRAIT ===== */}
                <div className="form-group">
                  <label>Mode de réception</label>
                  <div className="payment-options">
                    <label className={`payment-option ${deliveryMethod === "delivery" ? "selected" : ""}`}>
                      <input
                        type="radio"
                        name="deliveryMethod"
                        value="delivery"
                        checked={deliveryMethod === "delivery"}
                        onChange={() => setDeliveryMethod("delivery")}
                      />
                      <div>
                        <div className="payment-option-title">🚚 Livraison à domicile</div>
                        <div className="payment-option-desc">
                          Ouagadougou 1 500 FCFA · Autres villes 2 500 FCFA · Gratuit dès 200 000 FCFA
                        </div>
                      </div>
                    </label>
                    <label className={`payment-option ${deliveryMethod === "pickup" ? "selected" : ""}`}>
                      <input
                        type="radio"
                        name="deliveryMethod"
                        value="pickup"
                        checked={deliveryMethod === "pickup"}
                        onChange={() => setDeliveryMethod("pickup")}
                      />
                      <div>
                        <div className="payment-option-title">🏪 Retrait au point relais Kimoxa</div>
                        <div className="payment-option-desc">
                          Gratuit — venez récupérer votre commande à notre point de retrait (Ouagadougou).
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Adresse uniquement si livraison à domicile */}
                {deliveryMethod === "delivery" && (
                  <>
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
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ marginTop: 6, width: "100%" }}
                        onClick={useMyLocation}
                        disabled={locating}
                      >
                        📍 {locating ? "Localisation en cours..." : "Utiliser ma position GPS"}
                      </button>
                      {locError && (
                        <small style={{ color: "#dc2626", fontSize: "0.75rem" }}>{locError}</small>
                      )}
                    </div>
                  </>
                )}

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

                {/* 🎁 CODE PROMO */}
                <div className="form-group">
                  <label htmlFor="promo-code">Code promo (optionnel)</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      id="promo-code"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      placeholder="Ex : BIENVENUE10"
                      style={{ textTransform: "uppercase", flex: 1 }}
                    />
                    {promoResult && (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => { setPromoCode(""); setPromoResult(null); setPromoError(""); }}
                        title="Retirer le code"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {promoValidating && <small style={{ color: "var(--ink-400)" }}>Validation...</small>}
                  {promoResult && !promoValidating && (
                    <small style={{ color: "var(--millet-600)", fontWeight: 600 }}>
                      ✅ Code « {promoResult.code} » appliqué : -{promoResult.discount.toLocaleString("fr-FR")} FCFA
                    </small>
                  )}
                  {promoError && !promoValidating && (
                    <small style={{ color: "#dc2626" }}>❌ {promoError}</small>
                  )}
                </div>

                {/* ===== RÉCAP ===== */}
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
                    <span>
                      {deliveryMethod === "pickup"
                        ? "🏪 Retrait point relais"
                        : `🚚 Livraison (${detectedCity || "—"})`}
                    </span>
                    <strong style={{ color: deliveryFee === 0 ? "var(--millet-600)" : "var(--ink-900)" }}>
                      {formatDeliveryFee(deliveryFee, deliveryMethod)}
                    </strong>
                  </div>
                  {discount > 0 && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.85rem",
                        marginBottom: "8px",
                        color: "var(--millet-600)",
                      }}
                    >
                      <span>🎁 Remise ({promoResult.code})</span>
                      <strong>-{discount.toLocaleString("fr-FR")} FCFA</strong>
                    </div>
                  )}
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

                {/* ===== MODE DE PAIEMENT (Mobile Money ACTIVÉ) ===== */}
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
                        <div className="payment-option-title">💵 Payer à la réception</div>
                        <div className="payment-option-desc">
                          Vous réglez en espèces au moment de recevoir ou retirer votre commande.
                        </div>
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
                          Paiement sécurisé via Mobile Money — votre commande sera confirmée immédiatement.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary cart-checkout-btn"
                  disabled={submitting || (deliveryMethod === "delivery" && !shippingAddress)}
                >
                  {submitting ? "Validation..." : `Valider la commande (${grandTotal.toLocaleString("fr-FR")} FCFA)`}
                </button>
              </form>
            </div>

            {/* Total sticky mobile */}
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