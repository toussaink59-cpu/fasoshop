"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const DOC_LABELS = { cni: "CNI", passeport: "Passeport", permis: "Permis de conduire" };

function SalesSparkline({ data }) {
  const width = 600;
  const height = 90;
  const max = Math.max(...data.map((d) => d.gross), 1);
  const stepX = width / (data.length - 1 || 1);

  const points = data.map((d, i) => {
    const x = i * stepX;
    const y = height - (d.gross / max) * (height - 10) - 5;
    return `${x},${y}`;
  });

  const areaPoints = `0,${height} ${points.join(" ")} ${width},${height}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: 90, display: "block" }}>
      <polygon points={areaPoints} fill="var(--orange-100)" />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="var(--orange-500)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function VendorDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [adjustments, setAdjustments] = useState({});
  const [discountInputs, setDiscountInputs] = useState({});
  const [flashSaleInputs, setFlashSaleInputs] = useState({});
  const [shop, setShop] = useState(null);
  const [mmNumber, setMmNumber] = useState("");
  const [mmOperator, setMmOperator] = useState("orange_money");
  const [mmSaved, setMmSaved] = useState(false);
  const [mmError, setMmError] = useState("");
  const [revenue, setRevenue] = useState(null);
  const [lowStockAlertDismissed, setLowStockAlertDismissed] = useState(false);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [newOrdersAlertDismissed, setNewOrdersAlertDismissed] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [cityInput, setCityInput] = useState("");
  const [citySaved, setCitySaved] = useState(false);
  const [sponsorRequests, setSponsorRequests] = useState({});
  const [sponsorBusy, setSponsorBusy] = useState(null);

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

  // Resoumission de la pièce d'identité après un rejet
  const [resubmitDocType, setResubmitDocType] = useState("cni");
  const [resubmitDocNumber, setResubmitDocNumber] = useState("");
  const [resubmitError, setResubmitError] = useState("");
  const [resubmitting, setResubmitting] = useState(false);

  const [newProduct, setNewProduct] = useState({
    name: "",
    sku: "",
    price: "",
    compareAtPrice: "",
    stockQuantity: "",
    categoryId: "",
    condition: "neuf",
    brand: "",
  });
  const [categories, setCategories] = useState([]);
  const [selectedParentCat, setSelectedParentCat] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [manualImageUrls, setManualImageUrls] = useState([]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []));
  }, []);

  const subcategoriesForSelectedParent =
    categories.find((c) => String(c.id) === selectedParentCat)?.children || [];

  const loadStock = useCallback(async () => {
    const res = await fetch("/api/vendor/stock");
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    const data = await res.json();
    setProducts(data.products || []);
    setLoading(false);
  }, [router]);

  const loadRevenue = useCallback(async () => {
    const res = await fetch("/api/vendor/revenue");
    if (res.ok) {
      const data = await res.json();
      setRevenue(data.revenue || null);
    }
  }, []);

  const loadNewOrdersCount = useCallback(async () => {
    const res = await fetch("/api/vendor/orders");
    if (res.ok) {
      const data = await res.json();
      const items = data.items || [];
      const pendingOrderIds = new Set(
        items.filter((it) => it.delivery_status === "preparation").map((it) => it.order_id)
      );
      setNewOrdersCount(pendingOrderIds.size);
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.user || (data.user.role !== "vendor" && data.user.role !== "admin")) {
          router.push("/login");
          return;
        }
        setUser(data.user);
        loadStock();
        loadRevenue();
        loadNewOrdersCount();

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
  }, [loadStock, loadRevenue, loadNewOrdersCount, router]);

  function handleFileSelect(e) {
    const files = Array.from(e.target.files).slice(0, 5); // 5 photos max, comme Jumia
    setSelectedFiles(files);
    setPreviewUrls(files.map((f) => URL.createObjectURL(f)));
  }

  function handleAddImageUrl() {
    const url = imageUrlInput.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      setError("L'URL de l'image doit commencer par http:// ou https://");
      return;
    }
    setManualImageUrls((urls) => [...urls, url]);
    setImageUrlInput("");
  }

  function handleRemoveImageUrl(idx) {
    setManualImageUrls((urls) => urls.filter((_, i) => i !== idx));
  }

  async function uploadImages() {
    const urls = [];
    for (const file of selectedFiles) {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/vendor/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'envoi d'une image.");
      }
      urls.push(data.url);
    }
    return urls;
  }

  async function handleCreateProduct(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (selectedFiles.length === 0 && manualImageUrls.length === 0) {
      setError("Ajoutez au moins une photo (upload ou URL) du produit.");
      return;
    }

    setUploading(true);
    let imageUrls = [...manualImageUrls];
    try {
      const uploaded = await uploadImages();
      imageUrls = [...imageUrls, ...uploaded];
    } catch (err) {
      setError(err.message || "Erreur lors de l'envoi des photos.");
      setUploading(false);
      return;
    }
    setUploading(false);

    const res = await fetch("/api/vendor/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newProduct.name,
        sku: newProduct.sku || undefined,
        price: Number(newProduct.price),
        compareAtPrice: newProduct.compareAtPrice ? Number(newProduct.compareAtPrice) : undefined,
        stockQuantity: Number(newProduct.stockQuantity) || 0,
        categoryId: newProduct.categoryId || undefined,
        images: imageUrls,
        condition: newProduct.condition,
        brand: newProduct.brand || undefined,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Erreur lors de la création du produit.");
      return;
    }

    setSuccess(`Produit "${data.product.name}" ajouté avec ${data.product.stock_quantity} en stock.`);
    setNewProduct({ name: "", sku: "", price: "", compareAtPrice: "", stockQuantity: "", categoryId: "", condition: "neuf", brand: "" });
    setSelectedParentCat("");
    setSelectedFiles([]);
    setPreviewUrls([]);
    setManualImageUrls([]);
    setImageUrlInput("");
    setShowForm(false);
    loadStock();
  }

  async function handleAdjust(productId, direction) {
    const raw = adjustments[productId];
    const amount = Number(raw);
    if (!raw || isNaN(amount) || amount === 0) return;

    const adjustment = direction === "add" ? Math.abs(amount) : -Math.abs(amount);
    setError("");

    const res = await fetch(`/api/vendor/stock/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adjustment,
        reason: direction === "add" ? "Réapprovisionnement" : "Retrait manuel",
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Erreur lors de l'ajustement du stock.");
      return;
    }

    setAdjustments((a) => ({ ...a, [productId]: "" }));
    loadStock();
  }

  async function handleSaveCompareAtPrice(productId) {
    const raw = discountInputs[productId];
    setError("");

    const res = await fetch(`/api/vendor/stock/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        compareAtPrice: raw === "" || raw === undefined ? null : Number(raw),
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Erreur lors de la mise à jour du prix barré.");
      return;
    }

    loadStock();
  }

  async function handleActivateFlashSale(productId) {
    const raw = flashSaleInputs[productId];
    setError("");

    if (!raw) {
      setError("Choisis une date et heure de fin pour la vente flash.");
      return;
    }

    const res = await fetch(`/api/vendor/stock/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flashSaleEndsAt: new Date(raw).toISOString() }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Erreur lors de l'activation de la vente flash.");
      return;
    }

    loadStock();
  }

  async function handleDeactivateFlashSale(productId) {
    setError("");
    const res = await fetch(`/api/vendor/stock/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flashSaleEndsAt: null }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Erreur lors de la désactivation de la vente flash.");
      return;
    }

    setFlashSaleInputs((f) => ({ ...f, [productId]: "" }));
    loadStock();
  }

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

  async function handleDeleteProduct(productId, productName) {
    if (!window.confirm(`Supprimer définitivement "${productName}" ? Cette action est irréversible.`)) {
      return;
    }
    setError("");
    setSuccess("");

    const res = await fetch(`/api/vendor/stock/${productId}`, { method: "DELETE" });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Erreur lors de la suppression du produit.");
      return;
    }

    setSuccess(`Produit "${data.name}" supprimé.`);
    loadStock();
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

  async function handleRequestSponsor(productId) {
    setError("");
    setSponsorBusy(productId);

    const res = await fetch(`/api/vendor/products/${productId}/sponsor`, { method: "POST" });
    const data = await res.json();
    setSponsorBusy(null);

    if (!res.ok) {
      setError(data.error || "Erreur lors de la demande de sponsoring.");
      return;
    }

    setSponsorRequests((r) => ({ ...r, [productId]: "pending" }));
    setSuccess("Demande envoyée ! Contactez-nous pour finaliser le paiement, puis nous validerons la mise en avant.");
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const totalStock = products.reduce((sum, p) => sum + p.stock_quantity, 0);
  const lowStockProducts = products.filter((p) => p.stock_quantity <= p.low_stock_threshold);
  const lowStockCount = lowStockProducts.length;
  const isActive = shop?.status === "active";

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
          <a
            href="/vendor/orders"
            style={{ marginRight: 10, color: "var(--sand-50)", fontSize: "0.85rem", position: "relative" }}
          >
            Commandes reçues
            {newOrdersCount > 0 && (
              <span
                style={{
                  marginLeft: 6,
                  background: "var(--bissap-600)",
                  color: "white",
                  borderRadius: 999,
                  padding: "1px 7px",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                }}
              >
                {newOrdersCount}
              </span>
            )}
          </a>
          <button onClick={handleLogout}>Déconnexion</button>
        </div>
      </div>
      <div className="woven-strip" />

      <div className="content">
        <div className="page-header">
          <h1>Mon stock</h1>
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

        {!loading && newOrdersCount > 0 && !newOrdersAlertDismissed && (
          <div className="success-box" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div>
              🛍️ <strong>{newOrdersCount} nouvelle{newOrdersCount > 1 ? "s" : ""} commande{newOrdersCount > 1 ? "s" : ""}</strong> en attente de préparation.{" "}
              <a href="/vendor/orders" style={{ fontWeight: 600 }}>Voir les commandes reçues →</a>
            </div>
            <button className="btn btn-ghost" onClick={() => setNewOrdersAlertDismissed(true)}>
              Fermer
            </button>
          </div>
        )}

        {!loading && lowStockCount > 0 && !lowStockAlertDismissed && (
          <div className="error-box" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div>
              <strong>⚠️ Stock faible sur {lowStockCount} produit{lowStockCount > 1 ? "s" : ""} :</strong>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                {lowStockProducts.map((p) => (
                  <li key={p.id}>{p.name} — {p.stock_quantity} restant{p.stock_quantity > 1 ? "s" : ""}</li>
                ))}
              </ul>
            </div>
            <button className="btn btn-ghost" onClick={() => setLowStockAlertDismissed(true)}>
              Fermer
            </button>
          </div>
        )}

        {error && <div className="error-box">{error}</div>}
        {success && <div className="success-box">{success}</div>}

        <div className="panel">
          <h2>Revenus</h2>
          <p style={{ fontSize: "0.85rem", color: "var(--ink-400)", marginTop: -8, marginBottom: 16 }}>
            Une commission de 5,5% est prélevée par FasoShop sur chaque vente confirmée.
          </p>

          {!revenue ? (
            <p>Chargement...</p>
          ) : (
            <>
              <div className="stat-row">
                <div className="stat-card">
                  <div className="label">Ventes aujourd'hui</div>
                  <div className="value">{Number(revenue.todaySales).toLocaleString("fr-FR")} FCFA</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--ink-400)", marginTop: 2 }}>
                    {revenue.todayOrderCount} commande{revenue.todayOrderCount > 1 ? "s" : ""}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="label">Ventes ce mois-ci</div>
                  <div className="value">{Number(revenue.monthSales).toLocaleString("fr-FR")} FCFA</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--ink-400)", marginTop: 2 }}>
                    {revenue.monthOrderCount} commande{revenue.monthOrderCount > 1 ? "s" : ""}
                  </div>
                </div>
              </div>

              {revenue.dailySeries && revenue.dailySeries.some((d) => d.gross > 0) && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: "0.78rem", color: "var(--ink-400)", marginBottom: 8 }}>
                    Ventes des 30 derniers jours
                  </div>
                  <SalesSparkline data={revenue.dailySeries} />
                </div>
              )}

              <div className="stat-row">
                <div className="stat-card">
                  <div className="label">Ventes brutes</div>
                  <div className="value">{Number(revenue.grossSales).toLocaleString("fr-FR")} FCFA</div>
                </div>
                <div className="stat-card">
                  <div className="label">Commission FasoShop</div>
                  <div className="value">{Number(revenue.totalCommission).toLocaleString("fr-FR")} FCFA</div>
                </div>
                <div className="stat-card">
                  <div className="label">Solde à recevoir</div>
                  <div className="value" style={{ color: "var(--bissap-600)" }}>
                    {Number(revenue.netAmountDue).toLocaleString("fr-FR")} FCFA
                  </div>
                </div>
                <div className="stat-card">
                  <div className="label">Déjà versé</div>
                  <div className="value">{Number(revenue.netAmountSettled).toLocaleString("fr-FR")} FCFA</div>
                </div>
              </div>
            </>
          )}
        </div>

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

        <div className="stat-row">
          <div className="stat-card">
            <div className="label">Produits</div>
            <div className="value">{products.length}</div>
          </div>
          <div className="stat-card">
            <div className="label">Unités en stock</div>
            <div className="value">{totalStock}</div>
          </div>
          <div className="stat-card">
            <div className="label">Stock faible</div>
            <div className="value" style={{ color: lowStockCount > 0 ? "var(--bissap-600)" : "inherit" }}>
              {lowStockCount}
            </div>
          </div>
        </div>

        <div className="panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ marginBottom: 0 }}>Produits</h2>
            <button
              className="btn btn-primary"
              onClick={() => setShowForm((s) => !s)}
              disabled={!isActive}
              title={!isActive ? "Boutique non encore validée" : undefined}
            >
              {showForm ? "Annuler" : "+ Ajouter un produit"}
            </button>
          </div>

          {!isActive && (
            <p style={{ fontSize: "0.85rem", color: "var(--ink-400)", marginTop: 10 }}>
              Vous pourrez ajouter des produits dès que votre boutique sera validée par notre équipe.
            </p>
          )}

          {showForm && isActive && (
            <form onSubmit={handleCreateProduct} style={{ marginTop: 18 }}>
              <div className="form-row">
                <div>
                  <label htmlFor="p-name">Nom du produit</label>
                  <input
                    id="p-name"
                    required
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    placeholder="Ex : Sac à main artisanal"
                  />
                </div>
                <div>
                  <label htmlFor="p-sku">Référence (SKU)</label>
                  <input
                    id="p-sku"
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                    placeholder="Optionnel"
                  />
                </div>
                <div>
                  <label htmlFor="p-brand">Marque (optionnel)</label>
                  <input
                    id="p-brand"
                    value={newProduct.brand}
                    onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                    placeholder="Ex : Samsung, Nike..."
                  />
                </div>
              </div>
              <div className="form-row">
                <div>
                  <label htmlFor="p-price">Prix (FCFA)</label>
                  <input
                    id="p-price"
                    type="number"
                    min="0"
                    required
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    placeholder="15000"
                  />
                </div>
                <div>
                  <label htmlFor="p-compare-price">Prix barré (FCFA) — optionnel</label>
                  <input
                    id="p-compare-price"
                    type="number"
                    min="0"
                    value={newProduct.compareAtPrice}
                    onChange={(e) => setNewProduct({ ...newProduct, compareAtPrice: e.target.value })}
                    placeholder="Ex : 20000 (avant réduction)"
                  />
                </div>
                <div>
                  <label htmlFor="p-stock">Stock initial</label>
                  <input
                    id="p-stock"
                    type="number"
                    min="0"
                    value={newProduct.stockQuantity}
                    onChange={(e) => setNewProduct({ ...newProduct, stockQuantity: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="form-row">
                <div>
                  <label htmlFor="p-category">Catégorie</label>
                  <select
                    id="p-category"
                    value={selectedParentCat}
                    onChange={(e) => {
                      setSelectedParentCat(e.target.value);
                      setNewProduct({ ...newProduct, categoryId: "" });
                    }}
                  >
                    <option value="">— Choisir une catégorie —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="p-subcategory">Sous-catégorie</label>
                  <select
                    id="p-subcategory"
                    value={newProduct.categoryId}
                    onChange={(e) => setNewProduct({ ...newProduct, categoryId: e.target.value })}
                    disabled={!selectedParentCat}
                  >
                    <option value="">— Choisir une sous-catégorie —</option>
                    {subcategoriesForSelectedParent.map((sc) => (
                      <option key={sc.id} value={sc.id}>{sc.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="p-condition">État du produit</label>
                  <select
                    id="p-condition"
                    value={newProduct.condition}
                    onChange={(e) => setNewProduct({ ...newProduct, condition: e.target.value })}
                  >
                    <option value="neuf">Neuf</option>
                    <option value="quasi_neuf">Quasi neuf</option>
                    <option value="occasion">Occasion</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div>
                  <label htmlFor="p-images">Photos du produit (jusqu'à 5)</label>
                  <input
                    id="p-images"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleFileSelect}
                  />
                  {previewUrls.length > 0 && (
                    <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                      {previewUrls.map((url, idx) => (
                        <img
                          key={idx}
                          src={url}
                          alt={`Aperçu ${idx + 1}`}
                          style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 6, border: "1px solid var(--sand-200)" }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div>
                  <label htmlFor="p-image-url">Ou coller une URL d'image (si déjà hébergée ailleurs)</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      id="p-image-url"
                      type="text"
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      placeholder="https://exemple.com/mon-image.jpg"
                    />
                    <button type="button" className="btn btn-ghost" onClick={handleAddImageUrl}>
                      Ajouter
                    </button>
                  </div>
                  {manualImageUrls.length > 0 && (
                    <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                      {manualImageUrls.map((url, idx) => (
                        <div key={idx} style={{ position: "relative" }}>
                          <img
                            src={url}
                            alt={`URL ${idx + 1}`}
                            style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 6, border: "1px solid var(--sand-200)" }}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImageUrl(idx)}
                            style={{ position: "absolute", top: -6, right: -6, background: "var(--bissap-600)", color: "white", border: "none", borderRadius: "50%", width: 20, height: 20, fontSize: "0.7rem", cursor: "pointer" }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={uploading}>
                {uploading ? "Envoi des photos..." : "Enregistrer le produit"}
              </button>
            </form>
          )}
        </div>

        <div className="panel">
          {loading ? (
            <p>Chargement...</p>
          ) : products.length === 0 ? (
            <div className="empty-state">
              <div className="glyph">📦</div>
              <p>Aucun produit pour l'instant. Ajoutez votre premier produit ci-dessus.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>SKU</th>
                  <th>État</th>
                  <th>Prix</th>
                  <th>Prix barré</th>
                  <th>Vente Flash</th>
                  <th>Stock</th>
                  <th>Ajuster</th>
                  <th>Sponsoring</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const isLow = p.stock_quantity <= p.low_stock_threshold;
                  const isFlashActive = p.flash_sale_ends_at && new Date(p.flash_sale_ends_at) > new Date();
                  return (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td className="sku">{p.sku || "—"}</td>
                      <td>
                        <span className="badge badge-ok">
                          {p.condition === "occasion" ? "Occasion" : p.condition === "quasi_neuf" ? "Quasi neuf" : "Neuf"}
                        </span>
                      </td>
                      <td>{Number(p.price).toLocaleString("fr-FR")} FCFA</td>
                      <td>
                        <div className="stock-adjust">
                          <input
                            type="number"
                            min="0"
                            placeholder="Aucun"
                            value={
                              discountInputs[p.id] !== undefined
                                ? discountInputs[p.id]
                                : p.compare_at_price || ""
                            }
                            onChange={(e) =>
                              setDiscountInputs((d) => ({ ...d, [p.id]: e.target.value }))
                            }
                            style={{ width: 90 }}
                          />
                          <button
                            className="btn btn-ghost"
                            onClick={() => handleSaveCompareAtPrice(p.id)}
                          >
                            OK
                          </button>
                        </div>
                      </td>
                      <td>
                        {isFlashActive ? (
                          <div className="stock-adjust">
                            <span className="badge badge-low">
                              Jusqu'au {new Date(p.flash_sale_ends_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <button className="btn btn-ghost" onClick={() => handleDeactivateFlashSale(p.id)}>
                              Arrêter
                            </button>
                          </div>
                        ) : (
                          <div className="stock-adjust">
                            <input
                              type="datetime-local"
                              value={flashSaleInputs[p.id] || ""}
                              onChange={(e) =>
                                setFlashSaleInputs((f) => ({ ...f, [p.id]: e.target.value }))
                              }
                              style={{ width: 160 }}
                            />
                            <button className="btn btn-primary" onClick={() => handleActivateFlashSale(p.id)}>
                              Activer
                            </button>
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${isLow ? "badge-low" : "badge-ok"}`}>
                          {p.stock_quantity} {isLow ? "· faible" : ""}
                        </span>
                      </td>
                      <td>
                        <div className="stock-adjust">
                          <input
                            type="number"
                            min="0"
                            placeholder="Qté"
                            value={adjustments[p.id] || ""}
                            onChange={(e) =>
                              setAdjustments((a) => ({ ...a, [p.id]: e.target.value }))
                            }
                          />
                          <button className="btn btn-primary" onClick={() => handleAdjust(p.id, "add")}>
                            + Réappro
                          </button>
                          <button className="btn btn-ghost" onClick={() => handleAdjust(p.id, "remove")}>
                            − Retirer
                          </button>
                        </div>
                      </td>
                      <td>
                        {p.is_sponsored && p.sponsored_until && new Date(p.sponsored_until) > new Date() ? (
                          <span className="badge badge-ok">
                            Actif jusqu'au {new Date(p.sponsored_until).toLocaleDateString("fr-FR")}
                          </span>
                        ) : sponsorRequests[p.id] === "pending" ? (
                          <span className="badge badge-low">Demande envoyée</span>
                        ) : (
                          <button
                            className="btn btn-ghost"
                            onClick={() => handleRequestSponsor(p.id)}
                            disabled={sponsorBusy === p.id}
                          >
                            {sponsorBusy === p.id ? "..." : "🚀 Sponsoriser"}
                          </button>
                        )}
                      </td>
                      <td>
                        <button className="btn btn-danger" onClick={() => handleDeleteProduct(p.id, p.name)}>
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
