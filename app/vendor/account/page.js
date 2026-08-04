"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import VendorBottomNav from "@/app/components/VendorBottomNav";

const DOC_LABELS = { cni: "CNI", passeport: "Passeport", permis: "Permis de conduire" };

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

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand">
          🛒 FasoShop <span className="role-tag">Vendeur</span>
        </div>
        <div className="topbar-actions">
          <Link href="/messages" style={{ marginRight: 10, color: "var(--sand-50)", fontSize: "0.85rem" }}>
            Messages {unreadMessages > 0 ? `(${unreadMessages})` : ""}
          </Link>
          <button onClick={handleLogout}>Déconnexion</button>
        </div>
      </div>
      <div className="woven-strip" />

      <div className="content">
        <div className="page-header">
          <h1>Mon compte</h1>
          <p>{user ? `Connecté en tant que ${user.full_name}` : ""}</p>
        </div>

        {shop && shop.status === "pending" && (
          <div className="panel" style={{ borderLeft: "4px solid var(--gold-600)" }}>
            <strong>⏳ Boutique en attente de vérification</strong>
            <p style={{ fontSize: "0.9rem", color: "var(--ink-400)", marginTop: 6, marginBottom: 0 }}>
              Notre équipe vérifie les informations de votre pièce d'identité ({DOC_LABELS[shop.id_document_type] || shop.id_document_type} n° {shop.id_document_number}).
              Vous pourrez publier des produits dès que votre boutique sera validée.
            </p>
          </div>
        )}

        {shop && shop.status === "suspended" && (
          <div className="error-box">
            <strong>🚫 Boutique suspendue.</strong> Contactez le support FasoShop pour plus d'informations.
          </div>
        )}

        {shop && shop.status === "rejected" && (
          <div className="panel" style={{ borderLeft: "4px solid var(--bissap-600)" }}>
            <strong style={{ color: "var(--bissap-600)" }}>❌ Demande de compte vendeur non validée</strong>
            <p style={{ fontSize: "0.9rem", marginTop: 6 }}>
              Motif : {shop.rejection_reason || "Non précisé."}
            </p>
            <p style={{ fontSize: "0.9rem", color: "var(--ink-400)" }}>
              Corrigez les informations de votre pièce d'identité ci-dessous pour une nouvelle vérification.
            </p>

            {resubmitError && <div className="error-box">{resubmitError}</div>}

            <form onSubmit={handleResubmitDocuments}>
              <div className="form-row">
                <div>
                  <label htmlFor="resubmit-doc-type">Type de pièce</label>
                  <select
                    id="resubmit-doc-type"
                    value={resubmitDocType}
                    onChange={(e) => setResubmitDocType(e.target.value)}
                  >
                    <option value="cni">Carte Nationale d'Identité (CNI)</option>
                    <option value="passeport">Passeport</option>
                    <option value="permis">Permis de conduire</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="resubmit-doc-number">Numéro de la pièce</label>
                  <input
                    id="resubmit-doc-number"
                    required
                    value={resubmitDocNumber}
                    onChange={(e) => setResubmitDocNumber(e.target.value)}
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={resubmitting}>
                {resubmitting ? "Envoi..." : "Resoumettre pour vérification"}
              </button>
            </form>
          </div>
        )}

        <div className="panel">
          <h2>Reversements — Mobile Money</h2>
          <p style={{ fontSize: "0.85rem", color: "var(--ink-400)", marginTop: -8, marginBottom: 16 }}>
            Le numéro renseigné ici recevra automatiquement votre part des ventes payées en ligne, dès que le paiement en ligne sera activé.
          </p>

          {mmError && <div className="error-box">{mmError}</div>}
          {mmSaved && <div className="success-box">Numéro Mobile Money enregistré.</div>}

          <form onSubmit={handleSaveMobileMoney}>
            <div className="form-row">
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
                <label htmlFor="mm-number">Numéro Mobile Money</label>
                <input
                  id="mm-number"
                  required
                  value={mmNumber}
                  onChange={(e) => setMmNumber(e.target.value)}
                  placeholder="Ex : 70 00 00 00"
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary">
              {shop?.mobile_money_number ? "Mettre à jour" : "Enregistrer"}
            </button>
          </form>
        </div>

        <div className="panel">
          <h2>Ville de la boutique</h2>
          <p style={{ fontSize: "0.85rem", color: "var(--ink-400)", marginTop: -8, marginBottom: 16 }}>
            Utilisée pour le filtre "Ville" du catalogue, afin d'aider les acheteurs à trouver des boutiques proches d'eux.
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
      </div>
      <VendorBottomNav newOrdersCount={newOrdersCount} unreadMessages={unreadMessages} />
    </div>
  );
}
