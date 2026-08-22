"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import VendorBottomNav from "@/app/components/VendorBottomNav";
import {
  ClockIcon, CheckCircleIcon, XCircleIcon, ShieldXIcon, BadgeCheckIcon,
  TruckIcon, StoreIcon, SmartphoneIcon, MapPinIcon, ShoppingCartIcon,
  LightbulbIcon,
} from "@/app/components/Icons";

const DOC_LABELS = { cni: "CNI", passeport: "Passeport", permis: "Permis de conduire" };

const STATUS_CONFIG = {
  pending: { label: "En attente de vérification", color: "#f59e0b", Icon: ClockIcon },
  active: { label: "Boutique vérifiée", color: "var(--millet-600, #2f7a3d)", Icon: CheckCircleIcon },
  suspended: { label: "Boutique suspendue", color: "#dc2626", Icon: ShieldXIcon },
  rejected: { label: "Demande non validée", color: "var(--bissap-600, #b91c3c)", Icon: XCircleIcon },
};

export default function VendorAccountPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [shop, setShop] = useState(null);
  const [mmNumber, setMmNumber] = useState("");
  const [mmOperator, setMmOperator] = useState("orange_money");
  const [mmSaved, setMmSaved] = useState(false);
  const [mmError, setMmError] = useState("");
  const [cityInput, setCityInput] = useState("");
  const [citySaved, setCitySaved] = useState(false);

  const [deliveryFee, setDeliveryFee] = useState(1500);
  const [offersDelivery, setOffersDelivery] = useState(true);
  const [offersPickup, setOffersPickup] = useState(true);
  const [deliverySaved, setDeliverySaved] = useState(false);
  const [deliveryError, setDeliveryError] = useState("");

  const [resubmitDocType, setResubmitDocType] = useState("cni");
  const [resubmitDocNumber, setResubmitDocNumber] = useState("");
  const [resubmitError, setResubmitError] = useState("");
  const [resubmitting, setResubmitting] = useState(false);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.user || (data.user.role !== "vendor" && data.user.role !== "admin")) {
          router.push("/login");
          return;
        }
        setUser(data.user);

        fetch("/api/vendor/shop")
          .then((r) => r.json())
          .then((d) => {
            if (d.shop) {
              setShop(d.shop);
              setMmNumber(d.shop.mobile_money_number || "");
              setMmOperator(d.shop.mobile_money_operator || "orange_money");
              setResubmitDocType(d.shop.id_document_type || "cni");
              setResubmitDocNumber(d.shop.id_document_number || "");
              setCityInput(d.shop.city || "");
              setDeliveryFee(d.shop.delivery_fee ?? 1500);
              setOffersDelivery(d.shop.offers_delivery ?? true);
              setOffersPickup(d.shop.offers_pickup ?? true);
            }
          });
      });
  }, [router]);

  useEffect(() => {
    function loadUnread() {
      fetch("/api/conversations/unread-count")
        .then((r) => r.json())
        .then((d) => setUnreadMessages(d.unread || 0));
    }
    loadUnread();
    const timer = setInterval(loadUnread, 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetch("/api/vendor/orders").then(async (res) => {
      if (!res.ok) return;
      const data = await res.json();
      const items = data.items || [];
      const pendingOrderIds = new Set(
        items.filter((it) => it.delivery_status === "preparation").map((it) => it.order_id)
      );
      setNewOrdersCount(pendingOrderIds.size);
    });
  }, []);

  async function handleSaveMobileMoney(e) {
    e.preventDefault();
    setMmError("");
    setMmSaved(false);

    const res = await fetch("/api/vendor/shop", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobileMoneyNumber: mmNumber, mobileMoneyOperator: mmOperator }),
    });
    const data = await res.json();

    if (!res.ok) {
      setMmError(data.error || "Erreur lors de l'enregistrement.");
      return;
    }

    setShop(data.shop);
    setMmSaved(true);
    setTimeout(() => setMmSaved(false), 2500);
  }

  async function handleResubmitDocuments(e) {
    e.preventDefault();
    setResubmitError("");
    setResubmitting(true);

    const res = await fetch("/api/vendor/shop", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idDocumentType: resubmitDocType, idDocumentNumber: resubmitDocNumber }),
    });
    const data = await res.json();
    setResubmitting(false);

    if (!res.ok) {
      setResubmitError(data.error || "Erreur lors de la resoumission.");
      return;
    }

    setShop(data.shop);
  }

  async function handleSaveCity(e) {
    e.preventDefault();
    setCitySaved(false);

    const res = await fetch("/api/vendor/shop", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city: cityInput }),
    });
    const data = await res.json();

    if (res.ok) {
      setShop(data.shop);
      setCitySaved(true);
      setTimeout(() => setCitySaved(false), 2500);
    }
  }

  async function handleSaveDelivery(e) {
    e.preventDefault();
    setDeliveryError("");
    setDeliverySaved(false);

    if (!offersDelivery && !offersPickup) {
      setDeliveryError("Vous devez proposer au moins une option (livraison ou retrait).");
      return;
    }

    const res = await fetch("/api/vendor/shop", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deliveryFee: offersDelivery ? Number(deliveryFee) || 0 : 0,
        offersDelivery,
        offersPickup,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setDeliveryError(data.error || "Erreur lors de l'enregistrement.");
      return;
    }

    setShop(data.shop);
    setDeliverySaved(true);
    setTimeout(() => setDeliverySaved(false), 2500);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const status = shop?.status || "pending";
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.Icon;
  const needsVerification = status === "pending" && !shop?.id_document_type;
  const isRejected = status === "rejected";

  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand">
          <ShoppingCartIcon size={20} style={{ marginRight: 6, verticalAlign: "middle" }} />
          Kimoxa <span className="role-tag">Vendeur</span>
        </div>
        <div className="topbar-actions">
          <Link href="/messages" style={{ marginRight: 10, color: "var(--sand-50)", fontSize: "0.85rem" }}>
            Messages {unreadMessages > 0 ? `(${unreadMessages})` : ""}
          </Link>
          <button onClick={handleLogout}>Déconnexion</button>
        </div>
      </div>
      <div className="woven-strip" />

      <div className="vendor-account-wrap">
        <div className="vendor-status-banner" style={{ borderColor: statusConfig.color }}>
          <div className="vendor-status-icon" style={{ background: statusConfig.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <StatusIcon size={24} style={{ color: "#fff" }} />
          </div>
          <div className="vendor-status-text">
            <h2>{statusConfig.label}</h2>
            <p>{user ? `Bienvenue, ${user.full_name}` : "Compte vendeur"}</p>
          </div>
          {shop?.name && <div className="vendor-shop-name">{shop.name}</div>}
        </div>

        <div className="vendor-settings-grid">
          {(needsVerification || isRejected) && (
            <div className="vendor-setting-card">
              <div className="vendor-setting-header">
                <span className="vendor-setting-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 8, background: "var(--cream-100, #f5f0e8)" }}>
                  <BadgeCheckIcon size={24} style={{ color: "var(--gold-600)" }} />
                </span>
                <h3>{isRejected ? "Resoumettre votre identité" : "Vérification d'identité"}</h3>
              </div>
              {isRejected && (
                <p className="vendor-setting-desc">
                  Motif du refus : <strong>{shop?.rejection_reason || "Non précisé"}</strong>
                </p>
              )}
              {needsVerification && (
                <p className="vendor-setting-desc">
                  Renseignez votre pièce d'identité pour activer votre boutique et commencer à vendre.
                </p>
              )}
              {resubmitError && <div className="error-box">{resubmitError}</div>}
              <form onSubmit={handleResubmitDocuments}>
                <div className="vendor-form-row">
                  <div>
                    <label htmlFor="doc-type">Type de pièce</label>
                    <select
                      id="doc-type"
                      value={resubmitDocType}
                      onChange={(e) => setResubmitDocType(e.target.value)}
                    >
                      <option value="cni">CNI</option>
                      <option value="passeport">Passeport</option>
                      <option value="permis">Permis de conduire</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="doc-number">Numéro</label>
                    <input
                      id="doc-number"
                      required
                      value={resubmitDocNumber}
                      onChange={(e) => setResubmitDocNumber(e.target.value)}
                      placeholder="Ex : B01234567"
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" disabled={resubmitting}>
                  {resubmitting ? "Envoi..." : isRejected ? "Resoumettre" : "Soumettre"}
                </button>
              </form>
            </div>
          )}

          {status === "pending" && shop?.id_document_type && (
            <div className="vendor-setting-card">
              <div className="vendor-setting-header">
                <span className="vendor-setting-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 8, background: "var(--cream-100, #f5f0e8)" }}>
                  <ClockIcon size={24} style={{ color: "#f59e0b" }} />
                </span>
                <h3>Vérification en cours</h3>
              </div>
              <p className="vendor-setting-desc">
                Notre équipe vérifie votre pièce : <strong>{DOC_LABELS[shop.id_document_type]} n° {shop.id_document_number}</strong>
              </p>
              <p className="vendor-setting-hint">
                Vous pourrez publier des produits dès validation.
              </p>
            </div>
          )}

          {status === "active" && (
            <div className="vendor-setting-card" style={{ gridColumn: "1 / -1" }}>
              <div className="vendor-setting-header">
                <span className="vendor-setting-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 8, background: "var(--cream-100, #f5f0e8)" }}>
                  <TruckIcon size={24} style={{ color: "var(--gold-600)" }} />
                </span>
                <h3>Options de livraison</h3>
              </div>
              <p className="vendor-setting-desc">
                Vous organisez vous-même la livraison. Kimoxa ne s'en occupe pas.
                Le prix que vous fixez est ce que le client paie pour recevoir son colis.
              </p>

              {deliveryError && <div className="error-box">{deliveryError}</div>}
              {deliverySaved && <div className="success-box">Options enregistrées.</div>}

              <form onSubmit={handleSaveDelivery}>
                <label style={{ display: "flex", gap: 10, padding: 12, background: "var(--cream-50, #faf7f2)", borderRadius: 8, marginBottom: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={offersDelivery}
                    onChange={(e) => setOffersDelivery(e.target.checked)}
                    style={{ width: 18, height: 18, marginTop: 4, accentColor: "var(--millet-600, #2f7a3d)", flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <strong style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <TruckIcon size={18} style={{ color: "var(--gold-600)" }} /> Livraison à domicile
                    </strong>
                    <div style={{ fontSize: "0.85rem", color: "var(--ink-500)", marginTop: 2 }}>
                      Vous livrez vous-même les clients à leur adresse.
                    </div>
                  </div>
                </label>

                {offersDelivery && (
                  <div style={{ marginLeft: 30, marginBottom: 12 }}>
                    <label htmlFor="delivery-fee">Prix de livraison (FCFA)</label>
                    <input
                      id="delivery-fee"
                      type="number"
                      min="0"
                      max="50000"
                      value={deliveryFee}
                      onChange={(e) => setDeliveryFee(e.target.value)}
                      style={{ maxWidth: 200 }}
                    />
                    <div style={{ fontSize: "0.78rem", color: "var(--ink-400)", marginTop: 4, display: "flex", alignItems: "flex-start", gap: 6 }}>
                      <LightbulbIcon size={14} style={{ flexShrink: 0, marginTop: 2, color: "#f59e0b" }} />
                      <span>0 = livraison gratuite · 1 500 FCFA recommandé pour Ouaga · Ce montant va directement à vous (0% de commission Kimoxa)</span>
                    </div>
                  </div>
                )}

                <label style={{ display: "flex", gap: 10, padding: 12, background: "var(--cream-50, #faf7f2)", borderRadius: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={offersPickup}
                    onChange={(e) => setOffersPickup(e.target.checked)}
                    style={{ width: 18, height: 18, marginTop: 4, accentColor: "var(--millet-600, #2f7a3d)", flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <strong style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <StoreIcon size={18} style={{ color: "var(--gold-600)" }} /> Retrait en boutique (toujours gratuit)
                    </strong>
                    <div style={{ fontSize: "0.85rem", color: "var(--ink-500)", marginTop: 2 }}>
                      Le client vient chercher le colis chez vous — aucune frais à facturer.
                    </div>
                  </div>
                </label>

                <button type="submit" className="btn btn-primary" style={{ marginTop: 12 }}>
                  Enregistrer mes options
                </button>
              </form>
            </div>
          )}

          <div className="vendor-setting-card">
            <div className="vendor-setting-header">
              <span className="vendor-setting-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 8, background: "var(--cream-100, #f5f0e8)" }}>
                <SmartphoneIcon size={24} style={{ color: "var(--gold-600)" }} />
              </span>
              <h3>Reversements Mobile Money</h3>
            </div>
            <p className="vendor-setting-desc">
              Ce numéro recevra automatiquement votre part des ventes en ligne.
            </p>
            {mmError && <div className="error-box">{mmError}</div>}
            {mmSaved && <div className="success-box">Numéro enregistré avec succès.</div>}
            <form onSubmit={handleSaveMobileMoney}>
              <div className="vendor-form-row">
                <div>
                  <label htmlFor="mm-operator">Opérateur</label>
                  <select
                    id="mm-operator"
                    value={mmOperator}
                    onChange={(e) => setMmOperator(e.target.value)}
                  >
                    <option value="orange_money">Orange Money</option>
                    <option value="moov_money">Moov Money</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="mm-number">Numéro</label>
                  <input
                    id="mm-number"
                    required
                    value={mmNumber}
                    onChange={(e) => setMmNumber(e.target.value)}
                    placeholder="70 00 00 00"
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary">
                {shop?.mobile_money_number ? "Mettre à jour" : "Enregistrer"}
              </button>
            </form>
          </div>

          <div className="vendor-setting-card">
            <div className="vendor-setting-header">
              <span className="vendor-setting-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 8, background: "var(--cream-100, #f5f0e8)" }}>
                <MapPinIcon size={24} style={{ color: "var(--gold-600)" }} />
              </span>
              <h3>Ville de la boutique</h3>
            </div>
            <p className="vendor-setting-desc">
              Aide les acheteurs à trouver votre boutique dans le filtre "Ville".
            </p>
            {citySaved && <div className="success-box">Ville enregistrée.</div>}
            <form onSubmit={handleSaveCity} style={{ display: "flex", gap: 8 }}>
              <input
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                placeholder="Ex : Ouagadougou"
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn btn-primary">Enregistrer</button>
            </form>
          </div>

          {status === "suspended" && (
            <div className="vendor-setting-card vendor-alert-card">
              <div className="vendor-setting-header">
                <span className="vendor-setting-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 8, background: "var(--cream-100, #f5f0e8)" }}>
                  <ShieldXIcon size={24} style={{ color: "#dc2626" }} />
                </span>
                <h3>Boutique suspendue</h3>
              </div>
              <p className="vendor-setting-desc">
                Votre boutique est temporairement suspendue. Contactez le support Kimoxa pour plus d'informations.
              </p>
            </div>
          )}
        </div>
      </div>
      <VendorBottomNav newOrdersCount={newOrdersCount} unreadMessages={unreadMessages} />
    </div>
  );
}
