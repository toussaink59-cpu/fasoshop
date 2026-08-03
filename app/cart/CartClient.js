"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCart, updateQuantity, clearCart, cartTotal } from "@/lib/cart";
import SiteHeader from "@/app/components/SiteHeader";
import BottomNav from "@/app/components/BottomNav";

export default function CartClient({ initialUser, categories }) {
  const router = useRouter();
  // Le panier vit uniquement dans localStorage (jamais côté serveur) : lu de
  // façon synchrone dès le premier rendu, pas de fetch ni de "Chargement...".
  const [cart, setCart] = useState(() => (typeof window !== "undefined" ? getCart() : []));
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Resynchronise après hydratation : localStorage n'existe pas côté
    // serveur, donc le tout premier rendu serveur ne peut pas connaître le
    // panier. Évite un mismatch d'hydratation React.
    setCart(getCart());
  }, []);

  useEffect(() => {
    if (!initialUser) return; // pas connecté — le champ adresse reste libre
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
      <SiteHeader initialUser={initialUser} categories={categories} />

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
                {savedAddresses.length > 0 && (
                  <>
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
                    <br /><br />
                  </>
                )}

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
                  <label className="payment-option" style={{ opacity: 0.5, cursor: "not-allowed" }}>
                    <input type="radio" name="paymentMethod" value="mobile_money" disabled />
                    <div>
                      <div className="payment-option-title">📱 Payer maintenant (Orange Money / Moov Money)</div>
                      <div className="payment-option-desc">Bientôt disponible — revenez rapidement !</div>
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
      <BottomNav user={initialUser} />
    </div>
  );
}
