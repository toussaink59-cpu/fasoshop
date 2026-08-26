"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getCart, updateQuantity, clearCart, cartTotal } from "@/lib/cart";
import SiteHeader from "@/app/components/SiteHeader";
import BottomNav from "@/app/components/BottomNav";
import {
  ShoppingCartIcon, TrashIcon, StoreIcon, TruckIcon, MapPinIcon,
  SmartphoneIcon, CreditCardIcon, PackageIcon, BadgeCheckIcon,
  InfoIcon, AlertTriangleIcon, MinusIcon, PlusIcon, CheckCircleIcon,
} from "@/app/components/Icons";

export default function CartClient({ initialUser, categories }) {
  const router = useRouter();

  const [cart, setCart] = useState([]);
  const [liveShops, setLiveShops] = useState({});

  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("delivery");
  const [paymentMethod, setPaymentMethod] = useState("mobile_money");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoData, setPromoData] = useState(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [locError, setLocError] = useState("");

  
  async function applyPromo() {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoError("");
    try {
      const items = cart.map(i => ({ product_id: i.productId, shop_id: i.shopId, quantity: i.quantity, unit_price: i.price }));
      const r = await fetch("/api/promos/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCode, items }),
      });
      const d = await r.json();
      if (!r.ok || !d.valid) throw new Error(d.error || "Code invalide");
      setPromoData(d);
    } catch (err) {
      setPromoError(err.message);
      setPromoData(null);
    } finally {
      setPromoLoading(false);
    }
  }

  useEffect(() => {
    setCart(getCart());
  }, []);

  useEffect(() => {
    const ids = [...new Set(cart.map((i) => i.shopId).filter(Boolean))];
    if (ids.length === 0) return;
    fetch(`/api/shops/delivery?ids=${ids.join(",")}`)
      .then((r) => (r.ok ? r.json() : { shops: [] }))
      .then((d) => {
        const map = {};
        for (const s of d.shops || []) map[String(s.id)] = s;
        setLiveShops(map);
      })
      .catch(() => {});
  }, [cart]);

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

  useEffect(() => {
    if (!initialUser?.id) return;
    const controller = new AbortController();
    const syncCart = async () => {
      try {
        const totalCents = cart.reduce(
          (sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 0),
          0
        );
        await fetch("/api/cart/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: cart, totalCents }),
          signal: controller.signal,
        });
      } catch (e) {
        if (e.name !== "AbortError") console.warn("[cart sync]", e.message);
      }
    };
    const timer = setTimeout(syncCart, 1000);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [cart, initialUser?.id]);

  useEffect(() => {
    if (!initialUser?.id) return;
    fetch("/api/cart/sync", { method: "DELETE" }).catch(() => {});
  }, [initialUser?.id]);

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

  const subtotal = cartTotal(cart);

  const { deliveryFee, shopDeliveryDetails, canDeliver, cannotDeliverShops, isMultiShop } = useMemo(() => {
    if (cart.length === 0) {
      return { deliveryFee: 0, shopDeliveryDetails: [], canDeliver: true, cannotDeliverShops: [], isMultiShop: false };
    }

    const byShop = {};
    let unknownCounter = 0;
    for (const item of cart) {
      const key = item.shopId ? String(item.shopId) : `unknown-${unknownCounter++}`;
      if (!byShop[key]) {
        const live = liveShops[key];
        byShop[key] = {
          key,
          shopId: item.shopId,
          shopName: live?.name || item.shopName || "Boutique partenaire",
          offersDelivery: live ? Boolean(live.offers_delivery) : (item.offersDelivery ?? true),
          offersPickup: live ? Boolean(live.offers_pickup) : (item.offersPickup ?? true),
          deliveryFee: live
            ? Number(live.delivery_fee) || 0
            : item.deliveryFee != null
              ? Number(item.deliveryFee)
              : 1500,
          subtotal: 0,
          items: [],
        };
      }
      byShop[key].items.push(item);
      byShop[key].subtotal += item.price * item.quantity;
    }

    const shops = Object.values(byShop);
    const isMulti = shops.length > 1;

    if (deliveryMethod === "pickup") {
      return { deliveryFee: 0, shopDeliveryDetails: shops, canDeliver: true, cannotDeliverShops: [], isMultiShop: isMulti };
    }

    let total = 0;
    const cannotDeliver = [];
    for (const s of shops) {
      if (!s.offersDelivery) {
        cannotDeliver.push(s.shopName);
      } else {
        total += s.deliveryFee;
      }
    }

    return {
      deliveryFee: total,
      shopDeliveryDetails: shops,
      canDeliver: cannotDeliver.length === 0,
      cannotDeliverShops: cannotDeliver,
      isMultiShop: isMulti,
    };
  }, [cart, deliveryMethod, liveShops]);

  const totalDiscount = promoData ? Object.values(promoData.per_shop || {}).reduce((s, v) => s + Number(v || 0), 0) : 0;
  const grandTotal = Math.max(0, subtotal + deliveryFee - totalDiscount);

  async function handleCheckout(e) {
    e.preventDefault();
    setError("");

    const meRes = await fetch("/api/auth/me");
    const me = await meRes.json();
    if (!me.user) {
      router.push("/login");
      return;
    }

    if (deliveryMethod === "delivery") {
      if (!shippingAddress.trim()) {
        setError("Merci d'indiquer une adresse de livraison.");
        return;
      }
      if (!canDeliver) {
        setError(`${cannotDeliverShops.join(", ")} ne livre pas à domicile. Passez en retrait.`);
        return;
      }
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
        shippingAddress: deliveryMethod === "delivery" ? shippingAddress : "",
        phone,
        paymentMethod,
        deliveryMethod,
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
          <span className="cart-count" suppressHydrationWarning>
            {cart.length} article{cart.length > 1 ? "s" : ""}
          </span>
        </div>

        {error && <div className="error-box">{error}</div>}

        {cart.length === 0 ? (
          <div className="empty-state">
            <div className="glyph" style={{ display: "inline-flex", color: "var(--gold-600)" }}><ShoppingCartIcon size={48} /></div>
            <p>Votre panier est vide.</p>
            <Link href="/shop">
              <button className="btn btn-primary" style={{ marginTop: 10 }}>Voir le catalogue</button>
            </Link>
          </div>
        ) : (
          <>
            {isMultiShop && (
              <div style={{ background: "#eff6ff", border: "1px solid #93c5fd", color: "#1e40af", padding: "10px 14px", borderRadius: "10px", fontSize: "0.85rem", marginBottom: "16px", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <InfoIcon size={18} /> Votre panier contient <strong>{shopDeliveryDetails.length} boutiques</strong> — chaque vendeur prépare et livre séparément.
              </div>
            )}

            {deliveryMethod === "delivery" && !canDeliver && (
              <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#991b1b", padding: "10px 14px", borderRadius: "10px", fontSize: "0.85rem", marginBottom: "16px", display: "flex", alignItems: "center", gap: 8 }}>
                <AlertTriangleIcon size={18} /> <strong>{cannotDeliverShops.join(", ")}</strong> ne propose{cannotDeliverShops.length > 1 ? "nt" : ""} pas la livraison à domicile. Passez en « Retrait en boutique ».
              </div>
            )}

            {deliveryMethod === "delivery" && shopDeliveryDetails.length > 0 && (
              <div style={{ background: "var(--cream-100, #faf7f2)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: "0.85rem" }}>
                <div style={{ fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <TruckIcon size={16} /> Livraison (fixée par chaque vendeur) :
                </div>
                {shopDeliveryDetails.map((s) => (
                  <div key={s.key} style={{ display: "flex", justifyContent: "space-between", marginBottom: 2, color: "var(--ink-600)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}><StoreIcon size={14} /> {s.shopName}</span>
                    <span style={{ fontWeight: 600, color: s.deliveryFee === 0 ? "var(--millet-600)" : "var(--ink-900)" }}>
                      {s.deliveryFee === 0 ? "Gratuite" : `${s.deliveryFee.toLocaleString("fr-FR")} FCFA`}
                    </span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, paddingTop: 6, borderTop: "1px dashed var(--border)", fontWeight: 700 }}>
                  <span>Total livraison</span>
                  <span>{deliveryFee.toLocaleString("fr-FR")} FCFA</span>
                </div>
              </div>
            )}

            <div className="cart-items-list">
              {shopDeliveryDetails.map((shop) => (
                <div
                  key={shop.key}
                  style={{
                    marginBottom: isMultiShop ? 16 : 0,
                    background: isMultiShop ? "var(--cream-100, #faf7f2)" : "transparent",
                    border: isMultiShop ? "1px solid var(--border)" : "none",
                    borderRadius: isMultiShop ? 12 : 0,
                    padding: isMultiShop ? "12px 8px" : 0,
                  }}
                >
                  {isMultiShop && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 8px 12px 8px", borderBottom: "1px solid var(--border)", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: "var(--gold-600)", display: "inline-flex" }}><StoreIcon size={24} /></span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{shop.shopName}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--gold-600)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <BadgeCheckIcon size={12} /> Vendeur vérifié
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right", fontSize: "0.85rem" }}>
                        <div style={{ color: "var(--ink-400)", fontSize: "0.75rem" }}>Sous-total</div>
                        <strong>{shop.subtotal.toLocaleString("fr-FR")} FCFA</strong>
                      </div>
                    </div>
                  )}

                  {shop.items.map((item) => (
                    <div className="cart-item-card" key={item.productId}>
                      <div className="cart-item-image">
                        {item.image ? (
                          <Image src={item.image} alt={item.name} width={96} height={96} loading="lazy" unoptimized />
                        ) : (
                          <div className="cart-item-placeholder" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#999" }}>
                            <PackageIcon size={40} />
                          </div>
                        )}
                      </div>
                      <div className="cart-item-details">
                        <Link href={`/shop/${item.productId}`} className="cart-item-name">
                          {item.name}
                        </Link>
                        {!isMultiShop && (
                          <div className="cart-item-shop" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <StoreIcon size={14} />
                            <span>{item.shopName}</span>
                            <span style={{ color: "var(--gold-600)", display: "inline-flex" }}><BadgeCheckIcon size={14} /></span>
                          </div>
                        )}
                        <div className="cart-item-price">{item.price.toLocaleString("fr-FR")} FCFA</div>
                        <div className="cart-item-actions">
                          <div className="qty-stepper" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <button
                              onClick={() => changeQty(item.productId, item.quantity - 1)}
                              style={{ padding: "4px 8px" }}
                              aria-label={`Diminuer la quantité de ${item.name}`}
                            >
                              <MinusIcon size={14} />
                            </button>
                            <span style={{ padding: "0 8px" }} aria-live="polite">{item.quantity}</span>
                            <button
                              onClick={() => changeQty(item.productId, item.quantity + 1)}
                              style={{ padding: "4px 8px" }}
                              aria-label={`Augmenter la quantité de ${item.name}`}
                            >
                              <PlusIcon size={14} />
                            </button>
                          </div>
                          <button
                            className="cart-item-remove"
                            onClick={() => removeItem(item.productId)}
                            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                            aria-label={`Supprimer ${item.name} du panier`}
                          >
                            <TrashIcon size={14} /> Supprimer
                          </button>
                        </div>
                      </div>
                      <div className="cart-item-subtotal">
                        {(item.price * item.quantity).toLocaleString("fr-FR")} FCFA
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="cart-checkout-section">
              <h2>Réception et paiement</h2>
              <form onSubmit={handleCheckout}>
                <div className="form-group">
                  <label>Mode de réception</label>
                  <div className="payment-options">
                    <label className={`payment-option ${deliveryMethod === "delivery" ? "selected" : ""}`}>
                      <input type="radio" name="deliveryMethod" value="delivery" checked={deliveryMethod === "delivery"} onChange={() => setDeliveryMethod("delivery")} />
                      <div>
                        <div className="payment-option-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <TruckIcon size={18} /> Livraison à domicile
                        </div>
                        <div className="payment-option-desc">Le vendeur livre à votre adresse · prix fixé par chaque boutique</div>
                      </div>
                    </label>
                    <label className={`payment-option ${deliveryMethod === "pickup" ? "selected" : ""}`}>
                      <input type="radio" name="deliveryMethod" value="pickup" checked={deliveryMethod === "pickup"} onChange={() => setDeliveryMethod("pickup")} />
                      <div>
                        <div className="payment-option-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <StoreIcon size={18} /> Retrait en boutique
                        </div>
                        <div className="payment-option-desc">Gratuit · vous récupérez votre commande chez le vendeur</div>
                      </div>
                    </label>
                  </div>
                </div>

                {deliveryMethod === "delivery" && (
                  <>
                    {savedAddresses.length > 0 && (
                      <div className="form-group">
                        <label htmlFor="saved-address">Adresse enregistrée</label>
                        <select id="saved-address" value={selectedAddressId} onChange={(e) => handleAddressSelect(e.target.value)}>
                          {savedAddresses.map((a) => (
                            <option key={a.id} value={a.id}>{a.libelle}{a.par_defaut ? " (par défaut)" : ""}</option>
                          ))}
                          <option value="custom">Autre adresse...</option>
                        </select>
                      </div>
                    )}
                    <div className="form-group">
                      <label htmlFor="address">Adresse de livraison</label>
                      <input id="address" required value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} placeholder="Ex : Secteur 15, Ouagadougou" />
                      <button type="button" className="btn btn-ghost" style={{ marginTop: 6, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={useMyLocation} disabled={locating}>
                        <MapPinIcon size={16} /> {locating ? "Localisation en cours..." : "Utiliser ma position GPS"}
                      </button>
                      {locError && <small style={{ color: "#dc2626", fontSize: "0.75rem" }}>{locError}</small>}
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label htmlFor="phone">Numéro de téléphone</label>
                  <input id="phone" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ex : 70 00 00 00" />
                </div>

                <div style={{ background: "#faf7f2", border: "1px dashed var(--border)", borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: 6, color: "var(--ink-700)" }}>
                    <span>Sous-total produits</span>
                    <strong>{subtotal.toLocaleString("fr-FR")} FCFA</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: 8, color: "var(--ink-700)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {deliveryMethod === "pickup" ? <><StoreIcon size={14} /> Retrait en boutique</> : <><TruckIcon size={14} /> Livraison</>}
                    </span>
                    <strong style={{ color: deliveryFee === 0 ? "var(--millet-600)" : "var(--ink-900)" }}>
                      {deliveryFee === 0 ? "Gratuite" : `${deliveryFee.toLocaleString("fr-FR")} FCFA`}
                    </strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                    
            {totalDiscount > 0 && (
              <div className="cart-summary-line" style={{ color: "#166534" }}>
                <span>Réduction</span>
                <strong>-{totalDiscount.toLocaleString("fr-FR")} FCFA</strong>
              </div>
            )}
            <span style={{ fontWeight: 700, color: "var(--ink-900)" }}>Total à payer</span>
                    <strong style={{ fontSize: "1.1rem", color: "var(--ink-900)" }}>
                      {grandTotal.toLocaleString("fr-FR")} FCFA
                    </strong>
                  </div>
                </div>

                <div className="form-group">
                  <label>Mode de paiement</label>
                  <div className="payment-options">
                    <label className={`payment-option ${paymentMethod === "mobile_money" ? "selected" : ""}`}>
                      <input type="radio" name="paymentMethod" value="mobile_money" checked={paymentMethod === "mobile_money"} onChange={() => setPaymentMethod("mobile_money")} />
                      <div>
                        <div className="payment-option-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <SmartphoneIcon size={18} /> Mobile Money (recommandé)
                        </div>
                        <div className="payment-option-desc">Paiement immédiat · commission prélevée automatiquement</div>
                      </div>
                    </label>
                    <label className={`payment-option ${paymentMethod === "cod" ? "selected" : ""}`}>
                      <input type="radio" name="paymentMethod" value="cod" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} />
                      <div>
                        <div className="payment-option-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <CreditCardIcon size={18} /> Espèces
                        </div>
                        <div className="payment-option-desc">Au vendeur · la commission 8% reste due à Kimoxa</div>
                      </div>
                    </label>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary cart-checkout-btn" disabled={submitting || (deliveryMethod === "delivery" && !canDeliver)}>
                  {submitting ? "Validation..." : `Valider la commande (${grandTotal.toLocaleString("fr-FR")} FCFA)`}
                </button>
              </form>
            </div>

            <div className="cart-sticky-total">
              <div className="cart-sticky-label">Total</div>
              <div className="cart-sticky-price">{grandTotal.toLocaleString("fr-FR")} FCFA</div>
              <button className="btn btn-primary" onClick={() => window.scrollTo({ top: document.querySelector(".cart-checkout-section").offsetTop, behavior: "smooth" })}>
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
