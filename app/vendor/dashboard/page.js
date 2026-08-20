"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import VendorBottomNav from "@/app/components/VendorBottomNav";
import KimoxaLogo from "@/app/components/KimoxaLogo";
import VendorAnalytics from "@/app/components/VendorAnalytics";
import VendorInsights from "@/app/components/VendorInsights";

const DOC_LABELS = { cni: "CNI", passeport: "Passeport", permis: "Permis de conduire" };

// Parse les images qui peuvent arriver comme chaîne JSON depuis la DB
function parseImages(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string" && raw.trim().startsWith("[")) {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return [];
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
  const [lowStockAlertDismissed, setLowStockAlertDismissed] = useState(false);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [newOrdersAlertDismissed, setNewOrdersAlertDismissed] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [sponsorRequests, setSponsorRequests] = useState({});
  const [sponsorBusy, setSponsorBusy] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [expandedProduct, setExpandedProduct] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [cockpitData, setCockpitData] = useState(null);

  useEffect(() => {

    function loadCockpit() {
      fetch("/api/vendor/dashboard")
        .then((r) => r.json())
        .then((d) => setCockpitData(d))
        .catch(() => {});
    }
    loadCockpit();
    function loadUnread() {
      fetch("/api/conversations/unread-count")
        .then((r) => r.json())
        .then((d) => setUnreadMessages(d.unread || 0));
    }
    loadUnread();
    const timer = setInterval(loadUnread, 15000);
    return () => clearInterval(timer);
  }, []);

  const [resubmitDocType, setResubmitDocType] = useState("cni");
  const [resubmitDocNumber, setResubmitDocNumber] = useState("");
  const [resubmitError, setResubmitError] = useState("");
  const [resubmitting, setResubmitting] = useState(false);
  const [docDataUrl, setDocDataUrl] = useState("");
  const [docBusy, setDocBusy] = useState(false);

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
        loadNewOrdersCount();
        fetch("/api/vendor/earnings").then((r) => r.json()).then((d) => setEarnings(d.earnings || null));

        fetch("/api/vendor/shop")
          .then((r) => r.json())
          .then((d) => {
            if (d.shop) {
              setShop(d.shop);
              setResubmitDocType(d.shop.id_document_type || "cni");
              setResubmitDocNumber(d.shop.id_document_number || "");
            }
          });
      });
  }, [loadStock, loadNewOrdersCount, router]);

  function handleFileSelect(e) {
    const files = Array.from(e.target.files).slice(0, 5);
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

  // === Compression d'image pour la pièce d'identité ===
  async function compressImage(file, maxDim = 900, quality = 0.72) {
    const raw = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = raw;
    });
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", quality);
  }

  async function handleDocFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResubmitError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setResubmitError("Format non supporté. Utilisez JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setResubmitError("Image trop lourde (8 Mo max).");
      return;
    }
    setDocBusy(true);
    try {
      setDocDataUrl(await compressImage(file));
    } catch {
      setResubmitError("Impossible de lire cette image.");
    }
    setDocBusy(false);
  }

  async function handleResubmitDocuments(e) {
    e.preventDefault();
    setResubmitError("");
    if (!docDataUrl) {
      setResubmitError("La photo de la pièce d'identité est obligatoire.");
      return;
    }
    if (!resubmitDocNumber.trim()) {
      setResubmitError("Le numéro de la pièce est requis.");
      return;
    }
    setResubmitting(true);

    const res = await fetch("/api/vendor/shop", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idDocumentType: resubmitDocType,
        idDocumentNumber: resubmitDocNumber,
        idDocumentUrl: docDataUrl,
      }),
    });
    const data = await res.json();
    setResubmitting(false);

    if (!res.ok) {
      setResubmitError(data.error || "Erreur lors de la soumission.");
      return;
    }

    setShop(data.shop);
    setDocDataUrl("");
    setSuccess("Pièce d'identité soumise ! Nous vérifions votre compte (moins de 24h).");
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
  const outOfStockCount = products.filter((p) => p.stock_quantity === 0).length;

  const filteredProducts = products.filter((p) => {
    if (activeFilter === "low") return p.stock_quantity <= p.low_stock_threshold && p.stock_quantity > 0;
    if (activeFilter === "out") return p.stock_quantity === 0;
    return true;
  });

  // Zone d'upload réutilisable pour les 2 formulaires
  const DocUploadZone = (
    <>
      <label className="doc-upload-zone" htmlFor="verify-doc-file">
        {docDataUrl ? (
          <>
            <img src={docDataUrl} alt="Aperçu de la pièce" className="doc-upload-preview" />
            <div className="doc-upload-hint">✅ Photo ajoutée — cliquez pour remplacer</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: "1.8rem" }}>🪪</div>
            <strong>{docBusy ? "Traitement..." : "Photo de la pièce (recto) *"}</strong>
            <div className="doc-upload-hint">JPG, PNG ou WEBP · 8 Mo max · image nette et lisible</div>
          </>
        )}
      </label>
      <input
        id="verify-doc-file"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: "none" }}
        onChange={handleDocFile}
      />
      <div className="trust-security" style={{ justifyContent: "flex-start", color: "var(--ink-400)", paddingTop: 10, fontSize: "0.75rem" }}>
        <span>🔒</span>
        <span>Vos données sont chiffrées et utilisées uniquement pour la vérification.</span>
      </div>
    </>
  );

  return (
    <div className="shell">
      {/* ===== TOPBAR ===== */}
      <div className="topbar">
        <div className="brand">
          <KimoxaLogo light size={20} /> <span className="role-tag">Vendeur</span>
        </div>
        <div className="topbar-actions">
          <Link href="/messages" className="topbar-icon" aria-label="Messages">
            💬
            {unreadMessages > 0 && (
              <span className="topbar-badge">{unreadMessages > 9 ? "9+" : unreadMessages}</span>
            )}
          </Link>
          <Link href="/vendor/orders" className="topbar-icon" aria-label="Commandes reçues">
            📦
            {newOrdersCount > 0 && <span className="topbar-badge">{newOrdersCount > 9 ? "9+" : newOrdersCount}</span>}
          </Link>
          <button className="topbar-logout" onClick={handleLogout}>Déconnexion</button>
        </div>
      </div>
      <div className="woven-strip" />

      <div className="vendor-dashboard-wrap">
        <div className="vendor-dashboard-header">
          <h1>Tableau de bord</h1>
          <p>{user ? `Bienvenue, ${user.full_name}` : ""}</p>
        </div>

        {shop && shop.status === "pending" && !shop.id_document_type && (
          <div className="vendor-alert vendor-alert-warning">
            <strong>🪪 Vérifiez votre identité pour activer votre boutique</strong>
            <p>
              Votre compte vendeur est créé ! Soumettez votre pièce d'identité pour commencer à vendre
              <strong> sans aucune limite</strong> de produits ou de gains.
            </p>
            {resubmitError && <div className="error-box">{resubmitError}</div>}
            <form onSubmit={handleResubmitDocuments}>
              <div className="form-row">
                <div>
                  <label htmlFor="verify-doc-type">Type de pièce *</label>
                  <select
                    id="verify-doc-type"
                    value={resubmitDocType}
                    onChange={(e) => setResubmitDocType(e.target.value)}
                  >
                    <option value="cni">Carte Nationale d'Identité (CNI)</option>
                    <option value="passeport">Passeport</option>
                    <option value="permis">Permis de conduire</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="verify-doc-number">Numéro de la pièce *</label>
                  <input
                    id="verify-doc-number"
                    required
                    value={resubmitDocNumber}
                    onChange={(e) => setResubmitDocNumber(e.target.value)}
                    placeholder="Ex : B01234567"
                  />
                </div>
              </div>
              {DocUploadZone}
              <button type="submit" className="btn btn-primary" disabled={resubmitting || docBusy} style={{ marginTop: 10 }}>
                {resubmitting ? "Envoi..." : "Soumettre pour vérification"}
              </button>
            </form>
          </div>
        )}

        {shop && shop.status === "pending" && shop.id_document_type && (
          <div className="vendor-alert vendor-alert-info">
            <strong>⏳ Boutique en attente de vérification</strong>
            <p>
              Notre équipe vérifie les informations de votre pièce d'identité ({DOC_LABELS[shop.id_document_type] || shop.id_document_type} n° {shop.id_document_number}).
              Vous pourrez publier des produits dès que votre boutique sera validée (moins de 24h).
            </p>
          </div>
        )}

        {shop && shop.status === "suspended" && (
          <div className="vendor-alert vendor-alert-error">
            <strong>🚫 Boutique suspendue.</strong> Contactez le support Kimoxa pour plus d'informations.
          </div>
        )}

        {shop && shop.status === "rejected" && (
          <div className="vendor-alert vendor-alert-error">
            <strong>❌ Demande de compte vendeur non validée</strong>
            <p>Motif : {shop.rejection_reason || "Non précisé."}</p>
            <p>Corrigez les informations de votre pièce d'identité ci-dessous pour une nouvelle vérification.</p>
            {resubmitError && <div className="error-box">{resubmitError}</div>}
            <form onSubmit={handleResubmitDocuments}>
              <div className="form-row">
                <div>
                  <label htmlFor="resubmit-doc-type">Type de pièce *</label>
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
                  <label htmlFor="resubmit-doc-number">Numéro de la pièce *</label>
                  <input
                    id="resubmit-doc-number"
                    required
                    value={resubmitDocNumber}
                    onChange={(e) => setResubmitDocNumber(e.target.value)}
                  />
                </div>
              </div>
              {DocUploadZone}
              <button type="submit" className="btn btn-primary" disabled={resubmitting || docBusy} style={{ marginTop: 10 }}>
                {resubmitting ? "Envoi..." : "Resoumettre pour vérification"}
              </button>
            </form>
          </div>
        )}

                {/* 🚚 Modèle v3 : le vendeur livre toujours, prix fixé dans Mon compte */}
        {shop && shop.status === "active" && (
          <div className="vendor-alert vendor-alert-info">
            <strong>🚚 Vous livrez vous-même vos commandes</strong>
            <p>
              Fixez votre prix de livraison dans{" "}
              <a href="/vendor/account" style={{ fontWeight: 600 }}>Mon compte → Options de livraison</a>.
              Ce montant vous est reversé à 100% (0% de commission Kimoxa).
            </p>
          </div>
        )}

                {!loading && lowStockCount > 0 && !lowStockAlertDismissed && (
          <div className="vendor-alert vendor-alert-warning">
            <div style={{ flex: 1 }}>
              ⚠️ <strong>{lowStockCount} produit{lowStockCount > 1 ? "s" : ""} en stock faible</strong> — réapprovisionnez pour éviter les ruptures.{" "}
              <button className="btn btn-ghost" style={{ fontWeight: 600 }} onClick={() => { setActiveFilter("low"); setLowStockAlertDismissed(true); }}>Voir les produits →</button>
            </div>
            <button className="btn btn-ghost" onClick={() => setLowStockAlertDismissed(true)}>
              Fermer
            </button>
          </div>
        )}

{!loading && newOrdersCount > 0 && !newOrdersAlertDismissed && (
          <div className="vendor-alert vendor-alert-success">
            <div style={{ flex: 1 }}>
              🛍️ <strong>{newOrdersCount} nouvelle{newOrdersCount > 1 ? "s" : ""} commande{newOrdersCount > 1 ? "s" : ""}</strong> en attente de préparation.{" "}
              <a href="/vendor/orders" style={{ fontWeight: 600 }}>Voir les commandes reçues →</a>
            </div>
            <button className="btn btn-ghost" onClick={() => setNewOrdersAlertDismissed(true)}>
              Fermer
            </button>
          </div>
        )}

        {error && <div className="error-box">{error}</div>}
        {success && <div className="success-box">{success}</div>}

                {/* 📊 Analytics vendeur (données réelles + états vides) */}
        
      {/* 🎯 COCKPIT VENDEUR — KPIs + Alertes + Top produits */}
      {cockpitData && (
        <div style={{ display: "grid", gap: 16, marginBottom: 24 }}>
          {/* KPIs CA avec deltas */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
            <div className="vendor-stat-card">
              <div className="vendor-stat-icon">💰</div>
              <div className="vendor-stat-value" style={{ fontSize: "1.3rem" }}>
                {cockpitData.revenue.today.toLocaleString("fr-FR")} F
              </div>
              <div className="vendor-stat-label">Aujourd'hui</div>
            </div>
            <div className="vendor-stat-card">
              <div className="vendor-stat-icon">📈</div>
              <div className="vendor-stat-value" style={{ fontSize: "1.1rem" }}>
                {cockpitData.revenue.week.toLocaleString("fr-FR")} F
              </div>
              <div className="vendor-stat-label">
                Semaine{" "}
                <span style={{ color: cockpitData.revenue.week_delta >= 0 ? "#2e7d32" : "#c62828", fontSize: "0.85rem" }}>
                  {cockpitData.revenue.week_delta >= 0 ? "+" : ""}{cockpitData.revenue.week_delta}%
                </span>
              </div>
            </div>
            <div className="vendor-stat-card">
              <div className="vendor-stat-icon">🗓️</div>
              <div className="vendor-stat-value" style={{ fontSize: "1.1rem" }}>
                {cockpitData.revenue.month.toLocaleString("fr-FR")} F
              </div>
              <div className="vendor-stat-label">
                Mois{" "}
                <span style={{ color: cockpitData.revenue.month_delta >= 0 ? "#2e7d32" : "#c62828", fontSize: "0.85rem" }}>
                  {cockpitData.revenue.month_delta >= 0 ? "+" : ""}{cockpitData.revenue.month_delta}%
                </span>
              </div>
            </div>
            <div className="vendor-stat-card">
              <div className="vendor-stat-icon">⭐</div>
              <div className="vendor-stat-value" style={{ fontSize: "1.1rem" }}>
                {cockpitData.rating.avg_rating.toFixed(1)} / 5
              </div>
              <div className="vendor-stat-label">{cockpitData.rating.review_count} avis</div>
            </div>
          </div>

          {/* Alertes proactives */}
          {(cockpitData.stock.out_of_stock > 0 || cockpitData.stock.low_stock > 0 || cockpitData.unansweredReviews > 0) && (
            <div className="va-card" style={{ background: "#fff3cd", borderLeft: "4px solid #ffc107" }}>
              <h3 style={{ margin: "0 0 12px 0", fontSize: "1.05rem" }}>⚠️ À traiter</h3>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: "0.95rem" }}>
                {cockpitData.orders.to_prepare > 0 && (
                  <Link href="/vendor/orders" style={{ color: "#856404", textDecoration: "none" }}>
                    📦 <strong>{cockpitData.orders.to_prepare} commande(s)</strong> à préparer
                  </Link>
                )}
                {cockpitData.stock.out_of_stock > 0 && (
                  <Link href="/vendor/dashboard" style={{ color: "#856404", textDecoration: "none" }}>
                    🚫 <strong>{cockpitData.stock.out_of_stock} produit(s)</strong> en rupture
                  </Link>
                )}
                {cockpitData.stock.low_stock > 0 && (
                  <Link href="/vendor/dashboard" style={{ color: "#856404", textDecoration: "none" }}>
                    ⚠️ <strong>{cockpitData.stock.low_stock} produit(s)</strong> stock bas
                  </Link>
                )}
                {cockpitData.unansweredReviews > 0 && (
                  <Link href="/vendor/dashboard" style={{ color: "#856404", textDecoration: "none" }}>
                    💬 <strong>{cockpitData.unansweredReviews} avis</strong> sans réponse
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Top 3 produits du mois */}
          {cockpitData.topProducts.length > 0 && (
            <div className="va-card">
              <h3 style={{ margin: "0 0 12px 0", fontSize: "1.05rem" }}>🏆 Top 3 produits du mois</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {cockpitData.topProducts.map((p, i) => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 8, borderBottom: i < 2 ? "1px solid #eee" : "none" }}>
                    <div style={{ flex: 1 }}>
                      <strong>{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"} {p.name}</strong>
                      <div style={{ fontSize: "0.85rem", color: "#666" }}>{p.units_sold} unité(s) vendue(s)</div>
                    </div>
                    <div style={{ textAlign: "right", fontWeight: "bold", color: "#d4af37" }}>
                      {p.revenue.toLocaleString("fr-FR")} F
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <VendorAnalytics />

        {/* 🕐⭐ Commandes récentes + top produits + avis */}
        <VendorInsights />
        {/* 4 cartes stats */}
        <div className="vendor-stats-grid">
          <div className="vendor-stat-card">
            <div className="vendor-stat-icon">📦</div>
            <div className="vendor-stat-value">{products.length}</div>
            <div className="vendor-stat-label">Produits</div>
          </div>
          <div className="vendor-stat-card">
            <div className="vendor-stat-icon">📊</div>
            <div className="vendor-stat-value">{totalStock}</div>
            <div className="vendor-stat-label">Unités en stock</div>
          </div>
          <div className="vendor-stat-card">
            <div className="vendor-stat-icon">⚠️</div>
            <div className="vendor-stat-value" style={{ color: lowStockCount > 0 ? "var(--bissap-600)" : "inherit" }}>
              {lowStockCount}
            </div>
            <div className="vendor-stat-label">Stock faible</div>
          </div>
          <div className="vendor-stat-card">
            <div className="vendor-stat-icon">❌</div>
            <div className="vendor-stat-value">{outOfStockCount}</div>
            <div className="vendor-stat-label">Rupture</div>
          </div>
        </div>

        {/* Liens rapides */}
        <div className="vendor-quick-links">
          <Link href="/vendor/revenue" className="vendor-quick-link">
            💰 <strong>Revenus</strong>
            <span>Ventes, commission, solde</span>
          </Link>
          <Link href="/vendor/account" className="vendor-quick-link">
            🏪 <strong>Mon compte</strong>
            <span>Mobile Money, ville</span>
          </Link>
        </div>

        {/* Onglets de filtrage */}
        <div className="vendor-filters">
          <button
            className={`vendor-filter-btn ${activeFilter === "all" ? "active" : ""}`}
            onClick={() => setActiveFilter("all")}
          >
            Tous ({products.length})
          </button>
          <button
            className={`vendor-filter-btn ${activeFilter === "low" ? "active" : ""}`}
            onClick={() => setActiveFilter("low")}
          >
            Stock faible ({lowStockCount})
          </button>
          <button
            className={`vendor-filter-btn ${activeFilter === "out" ? "active" : ""}`}
            onClick={() => setActiveFilter("out")}
          >
            Rupture ({outOfStockCount})
          </button>
        </div>

        {/* Bouton ajouter produit */}
        <div className="vendor-actions-bar">
          <button
            className="btn btn-primary vendor-add-btn"
            onClick={() => setShowForm((s) => !s)}
            disabled={!isActive}
          >
            {showForm ? "✕ Annuler" : "+ Ajouter un produit"}
          </button>
        </div>

        {!isActive && (
          <p style={{ fontSize: "0.85rem", color: "var(--ink-400)", marginBottom: 16 }}>
            Vous pourrez ajouter des produits dès que votre boutique sera validée par notre équipe.
          </p>
        )}

        {showForm && isActive && (
          <div className="vendor-form-card">
            <h2>Nouveau produit</h2>
            <form onSubmit={handleCreateProduct}>
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
                  <label htmlFor="p-brand">Marque</label>
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
                  <label htmlFor="p-compare-price">Prix barré (FCFA)</label>
                  <input
                    id="p-compare-price"
                    type="number"
                    min="0"
                    value={newProduct.compareAtPrice}
                    onChange={(e) => setNewProduct({ ...newProduct, compareAtPrice: e.target.value })}
                    placeholder="Ex : 20000"
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
                    <option value="">— Choisir —</option>
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
                    <option value="">— Choisir —</option>
                    {subcategoriesForSelectedParent.map((sc) => (
                      <option key={sc.id} value={sc.id}>{sc.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="p-condition">État</label>
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
                  <label htmlFor="p-images">Photos (jusqu'à 5)</label>
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
                  <label htmlFor="p-image-url">Ou coller une URL d'image</label>
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
          </div>
        )}

        {/* Liste des produits */}
        <div className="vendor-products-section">
          <h2>Mes produits ({filteredProducts.length})</h2>

          {loading ? (
            <p>Chargement...</p>
          ) : filteredProducts.length === 0 ? (
            <div className="empty-state">
              <div className="glyph">📦</div>
              <p>Aucun produit {activeFilter !== "all" ? "pour ce filtre" : "pour l'instant"}. Ajoutez votre premier produit ci-dessus.</p>
            </div>
          ) : (
            <div className="vendor-products-grid">
              {filteredProducts.map((p) => {
                const isLow = p.stock_quantity <= p.low_stock_threshold;
                const isFlashActive = p.flash_sale_ends_at && new Date(p.flash_sale_ends_at) > new Date();
                const isExpanded = expandedProduct === p.id;
                const images = parseImages(p.images);

                return (
                  <div key={p.id} className="vendor-product-card">
                    <div className="vendor-product-header" onClick={() => setExpandedProduct(isExpanded ? null : p.id)}>
                      <div className="vendor-product-image">
                        {images.length > 0 ? (
                          <img src={images[0]} alt={p.name} />
                        ) : (
                          <div className="vendor-product-placeholder">📦</div>
                        )}
                      </div>
                      <div className="vendor-product-info">
                        <strong>{p.name}</strong>
                        <div className="vendor-product-meta">
                          <span className="vendor-product-price">{Number(p.price).toLocaleString("fr-FR")} FCFA</span>
                          {p.compare_at_price && (
                            <span className="vendor-product-old-price">{Number(p.compare_at_price).toLocaleString("fr-FR")} FCFA</span>
                          )}
                        </div>
                        <div className="vendor-product-badges">
                          <span className={`vendor-badge ${isLow ? "vendor-badge-warning" : "vendor-badge-ok"}`}>
                            {p.stock_quantity} en stock
                          </span>
                          {isFlashActive && <span className="vendor-badge vendor-badge-flash">⚡ Flash</span>}
                          {p.is_sponsored && <span className="vendor-badge vendor-badge-sponsored">🚀 Sponsorisé</span>}
                        </div>
                      </div>
                      <div className="vendor-product-expand">{isExpanded ? "▲" : "▼"}</div>
                    </div>

                    {isExpanded && (
                      <div className="vendor-product-actions">
                        <div className="vendor-action-group">
                          <label>Ajuster le stock</label>
                          <div className="vendor-action-row">
                            <input
                              type="number"
                              min="0"
                              placeholder="Qté"
                              value={adjustments[p.id] || ""}
                              onChange={(e) => setAdjustments((a) => ({ ...a, [p.id]: e.target.value }))}
                            />
                            <button className="btn btn-primary" onClick={() => handleAdjust(p.id, "add")}>
                              + Réappro
                            </button>
                            <button className="btn btn-ghost" onClick={() => handleAdjust(p.id, "remove")}>
                              − Retirer
                            </button>
                          </div>
                        </div>

                        <div className="vendor-action-group">
                          <label>Prix barré (FCFA)</label>
                          <div className="vendor-action-row">
                            <input
                              type="number"
                              min="0"
                              placeholder="Aucun"
                              value={discountInputs[p.id] !== undefined ? discountInputs[p.id] : p.compare_at_price || ""}
                              onChange={(e) => setDiscountInputs((d) => ({ ...d, [p.id]: e.target.value }))}
                            />
                            <button className="btn btn-primary" onClick={() => handleSaveCompareAtPrice(p.id)}>
                              Enregistrer
                            </button>
                          </div>
                        </div>

                        <div className="vendor-action-group">
                          <label>Vente flash</label>
                          {isFlashActive ? (
                            <div className="vendor-action-row">
                              <span className="vendor-flash-active">
                                Jusqu'au {new Date(p.flash_sale_ends_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                              </span>
                              <button className="btn btn-ghost" onClick={() => handleDeactivateFlashSale(p.id)}>
                                Arrêter
                              </button>
                            </div>
                          ) : (
                            <div className="vendor-action-row">
                              <input
                                type="datetime-local"
                                value={flashSaleInputs[p.id] || ""}
                                onChange={(e) => setFlashSaleInputs((f) => ({ ...f, [p.id]: e.target.value }))}
                              />
                              <button className="btn btn-primary" onClick={() => handleActivateFlashSale(p.id)}>
                                Activer
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="vendor-action-group">
                          <label>Sponsoring</label>
                          {p.is_sponsored && p.sponsored_until && new Date(p.sponsored_until) > new Date() ? (
                            <div className="vendor-action-row">
                              <span className="vendor-sponsored-active">
                                Actif jusqu'au {new Date(p.sponsored_until).toLocaleDateString("fr-FR")}
                              </span>
                            </div>
                          ) : sponsorRequests[p.id] === "pending" ? (
                            <div className="vendor-action-row">
                              <span className="vendor-sponsored-pending">Demande envoyée</span>
                            </div>
                          ) : (
                            <div className="vendor-action-row">
                              <button
                                className="btn btn-ghost"
                                onClick={() => handleRequestSponsor(p.id)}
                                disabled={sponsorBusy === p.id}
                              >
                                {sponsorBusy === p.id ? "..." : "🚀 Demander le sponsoring"}
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="vendor-action-group">
                          <button className="btn btn-danger" onClick={() => handleDeleteProduct(p.id, p.name)}>
                            🗑️ Supprimer le produit
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <VendorBottomNav newOrdersCount={newOrdersCount} unreadMessages={unreadMessages} />
    </div>
  );
}
