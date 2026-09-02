"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/lib/toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import VendorBottomNav from "@/app/components/VendorBottomNav";
import KimoxaLogo from "@/app/components/KimoxaLogo";
import VendorAnalytics from "@/app/components/VendorAnalytics";
import VendorInsights from "@/app/components/VendorInsights";
import ShareBar from "@/app/components/ShareBar";
import {
  CreditCardIcon, LockIcon, MessageIcon, PackageIcon, ClockIcon, XCircleIcon,
  TruckIcon, AlertTriangleIcon, ShoppingCartIcon, WalletIcon, BarChartIcon,
  StarIcon, BadgeCheckIcon, StoreIcon, UploadIcon, PlusIcon, TrashIcon,
  CheckCircleIcon, InfoIcon, RotateCcwIcon, MinusIcon,
} from "@/app/components/Icons";

const DOC_LABELS = { cni: "CNI", passeport: "Passeport", permis: "Permis de conduire" };

function parseImages(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string" && raw.trim().startsWith("[")) {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return [];
}

export default function VendorDashboard() {
  const toast = useToast();
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
  const [sponsorPickerFor, setSponsorPickerFor] = useState(null);
  const [sponsorPickerDays, setSponsorPickerDays] = useState(180);
  const [sponsorPhone, setSponsorPhone] = useState("");
  const [sponsorPaying, setSponsorPaying] = useState(false);
  const [promos, setPromos] = useState([]);
  const [promoForm, setPromoForm] = useState({ code: "", discount_type: "percent", discount_value: 10, min_amount: 0, max_uses: "", expires_at: "" });
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [expandedProduct, setExpandedProduct] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [cockpitData, setCockpitData] = useState(null);

  useEffect(() => {
    function loadCockpit() {
      fetch("/api/vendor/dashboard")
        .then((r) => r.ok ? r.json() : null)
        .then((d) => { if (d && d.revenue && d.orders && d.stock) setCockpitData(d); })
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
    name: "", sku: "", price: "", compareAtPrice: "", stockQuantity: "",
    categoryId: "", condition: "neuf", brand: "",
  });
  const [categories, setCategories] = useState([]);
  const [selectedParentCat, setSelectedParentCat] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [manualImageUrls, setManualImageUrls] = useState([]);

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then((d) => setCategories(d.categories || []));
  }, []);

  const subcategoriesForSelectedParent =
    categories.find((c) => String(c.id) === selectedParentCat)?.children || [];

  const loadStock = useCallback(async () => {
    const res = await fetch("/api/vendor/stock");
    if (res.status === 401) { router.push("/login"); return; }
    const data = await res.json();
    setProducts(data.products || []);
    setLoading(false);
  }, [router]);

  const loadNewOrdersCount = useCallback(async () => {
    const res = await fetch("/api/vendor/orders");
    if (res.ok) {
      const data = await res.json();
      const items = data.items || [];
      const pendingOrderIds = new Set(items.filter((it) => it.delivery_status === "preparation").map((it) => it.order_id));
      setNewOrdersCount(pendingOrderIds.size);
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((data) => {
      if (!data.user || (data.user.role !== "vendor" && data.user.role !== "admin")) {
        router.push("/login"); return;
      }
      setUser(data.user);
      loadStock();
      loadNewOrdersCount();
      fetch("/api/vendor/earnings").then((r) => r.json()).then((d) => setEarnings(d.earnings || null));
      fetch("/api/vendor/shop").then((r) => r.json()).then((d) => {
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
    if (!/^https?:\/\//i.test(url)) { setError("L'URL de l'image doit commencer par http:// ou https://"); return; }
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
      const res = await fetch("/api/vendor/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'envoi d'une image.");
      urls.push(data.url);
    }
    return urls;
  }

  async function handleCreateProduct(e) {
    e.preventDefault();
    setError(""); setSuccess("");
    if (selectedFiles.length === 0 && manualImageUrls.length === 0) {
      setError("Ajoutez au moins une photo (upload ou URL) du produit."); return;
    }
    setUploading(true);
    let imageUrls = [...manualImageUrls];
    try {
      const uploaded = await uploadImages();
      imageUrls = [...imageUrls, ...uploaded];
    } catch (err) {
      setError(err.message || "Erreur lors de l'envoi des photos.");
      setUploading(false); return;
    }
    setUploading(false);
    const res = await fetch("/api/vendor/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newProduct.name, sku: newProduct.sku || undefined,
        price: Number(newProduct.price),
        compareAtPrice: newProduct.compareAtPrice ? Number(newProduct.compareAtPrice) : undefined,
        stockQuantity: Number(newProduct.stockQuantity) || 0,
        categoryId: newProduct.categoryId || undefined,
        images: imageUrls, condition: newProduct.condition, brand: newProduct.brand || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Erreur lors de la création du produit."); return; }
    setSuccess(`Produit "${data.product.name}" ajouté avec ${data.product.stock_quantity} en stock.`);
    setNewProduct({ name: "", sku: "", price: "", compareAtPrice: "", stockQuantity: "", categoryId: "", condition: "neuf", brand: "" });
    setSelectedParentCat("");
    setSelectedFiles([]); setPreviewUrls([]); setManualImageUrls([]); setImageUrlInput("");
    setShowForm(false); loadStock();
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
    if (!res.ok) { setError(data.error || "Erreur lors de l'ajustement du stock."); return; }
    setAdjustments((a) => ({ ...a, [productId]: "" }));
    loadStock();
  }

  async function handleSaveCompareAtPrice(productId) {
    const raw = discountInputs[productId];
    setError("");
    const res = await fetch(`/api/vendor/stock/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ compareAtPrice: raw === "" || raw === undefined ? null : Number(raw) }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Erreur lors de la mise à jour du prix barré."); return; }
    loadStock();
  }

  async function handleActivateFlashSale(productId) {
    const raw = flashSaleInputs[productId];
    setError("");
    if (!raw) { setError("Choisis une date et heure de fin pour la vente flash."); return; }
    const res = await fetch(`/api/vendor/stock/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flashSaleEndsAt: new Date(raw).toISOString() }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Erreur lors de l'activation de la vente flash."); return; }
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
    if (!res.ok) { setError(data.error || "Erreur lors de la désactivation de la vente flash."); return; }
    setFlashSaleInputs((f) => ({ ...f, [productId]: "" }));
    loadStock();
  }

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
      setResubmitError("Format non supporté. Utilisez JPG, PNG ou WEBP."); return;
    }
    if (file.size > 8 * 1024 * 1024) { setResubmitError("Image trop lourde (8 Mo max)."); return; }
    setDocBusy(true);
    try { setDocDataUrl(await compressImage(file)); }
    catch { setResubmitError("Impossible de lire cette image."); }
    setDocBusy(false);
  }

  async function handleResubmitDocuments(e) {
    e.preventDefault();
    setResubmitError("");
    if (!docDataUrl) { setResubmitError("La photo de la pièce d'identité est obligatoire."); return; }
    if (!resubmitDocNumber.trim()) { setResubmitError("Le numéro de la pièce est requis."); return; }
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
    if (!res.ok) { setResubmitError(data.error || "Erreur lors de la soumission."); return; }
    setShop(data.shop); setDocDataUrl("");
    setSuccess("Pièce d'identité soumise ! Nous vérifions votre compte (moins de 24h).");
  }

  async function handleDeleteProduct(productId, productName) {
    if (!window.confirm(`Supprimer définitivement "${productName}" ? Cette action est irréversible.`)) return;
    setError(""); setSuccess("");
    const res = await fetch(`/api/vendor/stock/${productId}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Erreur lors de la suppression du produit."); return; }
    setSuccess(`Produit "${data.name}" supprimé.`);
    loadStock();
  }

  

  async function loadPromos() {
    try {
      const r = await fetch("/api/vendor/promos");
      const d = await r.json();
      setPromos(d.promos || []);
    } catch {}
  }

  async function createPromo(e) {
    e.preventDefault();
    setPromoError("");
    setPromoLoading(true);
    try {
      const r = await fetch("/api/vendor/promos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...promoForm,
          discount_value: Number(promoForm.discount_value),
          min_amount: Number(promoForm.min_amount) || 0,
          max_uses: promoForm.max_uses ? Number(promoForm.max_uses) : null,
          expires_at: promoForm.expires_at || null,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Erreur");
      setPromoForm({ code: "", discount_type: "percent", discount_value: 10, min_amount: 0, max_uses: "", expires_at: "" });
      await loadPromos();
      setSuccess(`Code ${d.promo.code} créé !`);
    } catch (err) {
      setPromoError(err.message);
    } finally {
      setPromoLoading(false);
    }
  }

  async function deletePromo(id) {
    if (!confirm("Supprimer ce code promo ?")) return;
    await fetch(`/api/vendor/promos?id=${id}`, { method: "DELETE" });
    await loadPromos();
  }

  async function handleRequestSponsor(productId, durationDays, mode) {
    setError("");
    setSponsorBusy(productId);

    if (mode === "later") {
      // Mode "Payer plus tard" : flux manuel actuel
      const res = await fetch(`/api/vendor/products/${productId}/sponsor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationDays }),
      });
      const data = await res.json();
      setSponsorBusy(null);
      setSponsorPickerFor(null);
      if (!res.ok) { setError(data.error || "Erreur lors de la demande."); return; }
      setSponsorRequests((r) => ({ ...r, [productId]: "pending" }));
      setSuccess(`Demande envoyée (${durationDays}j) ! Contactez-nous pour le paiement, nous validerons ensuite.`);
      return;
    }

    // Mode "Payer maintenant" : Ligdicash direct
    if (!sponsorPhone || sponsorPhone.length < 8) {
      setError("Veuillez saisir un numéro Mobile Money valide (ex: 70123456).");
      setSponsorBusy(null);
      return;
    }
    setSponsorPaying(true);
    try {
      const res = await fetch(`/api/vendor/products/${productId}/sponsor/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationDays, phone: sponsorPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur de paiement");
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
        return;
      }
      throw new Error("Aucune URL de paiement retournée");
    } catch (err) {
      setError(err.message);
    } finally {
      setSponsorPaying(false);
      setSponsorBusy(null);
    }
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

  const DocUploadZone = (
    <>
      <label className="doc-upload-zone" htmlFor="verify-doc-file">
        {docDataUrl ? (
          <>
            <img src={docDataUrl} alt="Aperçu de la pièce" className="doc-upload-preview" />
            <div className="doc-upload-hint" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <CheckCircleIcon size={16} /> Photo ajoutée — cliquez pour remplacer
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
              <UploadIcon size={32} style={{ color: "var(--gold-600)" }} />
            </div>
            <strong>{docBusy ? "Traitement..." : "Photo de la pièce (recto) *"}</strong>
            <div className="doc-upload-hint">JPG, PNG ou WEBP · 8 Mo max · image nette et lisible</div>
          </>
        )}
      </label>
      <input
        id="verify-doc-file" type="file" accept="image/jpeg,image/png,image/webp"
        style={{ display: "none" }} onChange={handleDocFile}
      />
      <div className="trust-security" style={{ justifyContent: "flex-start", color: "var(--ink-400)", paddingTop: 10, fontSize: "0.75rem", display: "flex", alignItems: "center", gap: 6 }}>
        <LockIcon size={14} />
        <span>Vos données sont chiffrées et utilisées uniquement pour la vérification.</span>
      </div>
    </>
  );

  const MedalBadge = ({ rank }) => {
    const colors = { 1: "#ffd700", 2: "#c0c0c0", 3: "#cd7f32" };
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 24, height: 24, borderRadius: "50%", background: colors[rank] || "#999",
        color: "#fff", fontWeight: 700, fontSize: "0.85rem", marginRight: 8,
      }}>
        {rank}
      </span>
    );
  };

  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand">
          <KimoxaLogo light size={20} /> <span className="role-tag">Vendeur</span>
        </div>
        <div className="topbar-actions">
          <Link href="/messages" className="topbar-icon" aria-label="Messages" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <MessageIcon size={18} />
            {unreadMessages > 0 && <span className="topbar-badge">{unreadMessages > 9 ? "9+" : unreadMessages}</span>}
          </Link>
          <Link href="/vendor/orders" className="topbar-icon" aria-label="Commandes reçues" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <PackageIcon size={18} />
            {newOrdersCount > 0 && <span className="topbar-badge">{newOrdersCount > 9 ? "9+" : newOrdersCount}</span>}
          </Link>
          {lowStockCount > 0 && (
            <button className="topbar-icon" onClick={() => { setActiveFilter("low"); setLowStockAlertDismissed(true); document.getElementById("vendor-products-section")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} aria-label="Stock faible" title="Stock faible" style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", position: "relative", color: "#fff" }}>
              <AlertTriangleIcon size={18} />
              <span className="topbar-badge">{lowStockCount > 9 ? "9+" : lowStockCount}</span>
            </button>
          )}
          <Link href="/vendor/account" className="topbar-icon" aria-label="Options de livraison" title="Options de livraison" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <TruckIcon size={18} />
          </Link>
          <button className="topbar-logout" onClick={handleLogout}>Déconnexion</button>
        </div>
      </div>
      <div className="woven-strip" />

      <div className="vendor-dashboard-wrap">
        <div className="vendor-dashboard-header">
          <h1>Tableau de bord</h1>
          <p>{user ? `Bienvenue, ${user.full_name}` : ""}</p>
          {shop && (
            <div style={{ marginTop: 12 }}>
              <ShareBar
                title={shop.name + " — Ma boutique Kimoxa"}
                price={0}
                url={typeof window !== "undefined" ? window.location.origin + "/boutique/" + shop.id : ""}
              />
            </div>
          )}
        </div>

        {shop && shop.status === "pending" && !shop.id_document_type && (
          <div className="vendor-alert vendor-alert-warning">
            <strong style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CreditCardIcon size={18} /> Vérifiez votre identité pour activer votre boutique
            </strong>
            <p>
              Votre compte vendeur est créé ! Soumettez votre pièce d'identité pour commencer à vendre
              <strong> sans aucune limite</strong> de produits ou de gains.
            </p>
            {resubmitError && <div className="error-box">{resubmitError}</div>}
            <form onSubmit={handleResubmitDocuments}>
              <div className="form-row">
                <div>
                  <label htmlFor="verify-doc-type">Type de pièce *</label>
                  <select id="verify-doc-type" value={resubmitDocType} onChange={(e) => setResubmitDocType(e.target.value)}>
                    <option value="cni">Carte Nationale d'Identité (CNI)</option>
                    <option value="passeport">Passeport</option>
                    <option value="permis">Permis de conduire</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="verify-doc-number">Numéro de la pièce *</label>
                  <input id="verify-doc-number" required value={resubmitDocNumber} onChange={(e) => setResubmitDocNumber(e.target.value)} placeholder="Ex : B01234567" />
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
            <strong style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ClockIcon size={18} /> Boutique en attente de vérification
            </strong>
            <p>
              Notre équipe vérifie les informations de votre pièce d'identité ({DOC_LABELS[shop.id_document_type] || shop.id_document_type} n° {shop.id_document_number}).
              Vous pourrez publier des produits dès que votre boutique sera validée (moins de 24h).
            </p>
          </div>
        )}

        {shop && shop.status === "suspended" && (
          <div className="vendor-alert vendor-alert-error">
            <strong style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <XCircleIcon size={18} /> Boutique suspendue.
            </strong> Contactez le support Kimoxa pour plus d'informations.
          </div>
        )}

        {shop && shop.status === "rejected" && (
          <div className="vendor-alert vendor-alert-error">
            <strong style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <XCircleIcon size={18} /> Demande de compte vendeur non validée
            </strong>
            <p>Motif : {shop.rejection_reason || "Non précisé."}</p>
            <p>Corrigez les informations de votre pièce d'identité ci-dessous pour une nouvelle vérification.</p>
            {resubmitError && <div className="error-box">{resubmitError}</div>}
            <form onSubmit={handleResubmitDocuments}>
              <div className="form-row">
                <div>
                  <label htmlFor="resubmit-doc-type">Type de pièce *</label>
                  <select id="resubmit-doc-type" value={resubmitDocType} onChange={(e) => setResubmitDocType(e.target.value)}>
                    <option value="cni">Carte Nationale d'Identité (CNI)</option>
                    <option value="passeport">Passeport</option>
                    <option value="permis">Permis de conduire</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="resubmit-doc-number">Numéro de la pièce *</label>
                  <input id="resubmit-doc-number" required value={resubmitDocNumber} onChange={(e) => setResubmitDocNumber(e.target.value)} />
                </div>
              </div>
              {DocUploadZone}
              <button type="submit" className="btn btn-primary" disabled={resubmitting || docBusy} style={{ marginTop: 10 }}>
                {resubmitting ? "Envoi..." : "Resoumettre pour vérification"}
              </button>
            </form>
          </div>
        )}







        {error && <div className="error-box">{error}</div>}
        {success && <div className="success-box">{success}</div>}

        {cockpitData && (
          <div style={{ display: "grid", gap: 16, marginBottom: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
              <div className="vendor-stat-card">
                <div className="vendor-stat-icon" style={{ color: "var(--gold-600)" }}><WalletIcon size={28} /></div>
                <div className="vendor-stat-value" style={{ fontSize: "1.3rem" }}>
                  {cockpitData.revenue.today.toLocaleString("fr-FR")} F
                </div>
                <div className="vendor-stat-label">Aujourd'hui</div>
              </div>
              <div className="vendor-stat-card">
                <div className="vendor-stat-icon" style={{ color: "var(--gold-600)" }}><BarChartIcon size={28} /></div>
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
                <div className="vendor-stat-icon" style={{ color: "var(--gold-600)" }}><ClockIcon size={28} /></div>
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
                <div className="vendor-stat-icon" style={{ color: "var(--gold-500)" }}><StarIcon size={28} /></div>
                <div className="vendor-stat-value" style={{ fontSize: "1.1rem" }}>
                  {cockpitData.rating.avg_rating.toFixed(1)} / 5
                </div>
                <div className="vendor-stat-label">{cockpitData.rating.review_count} avis</div>
              </div>
            </div>

            {(cockpitData.stock.out_of_stock > 0 || cockpitData.stock.low_stock > 0 || cockpitData.unansweredReviews > 0) && (
              <div className="va-card" style={{ background: "#fff3cd", borderLeft: "4px solid #ffc107" }}>
                <h3 style={{ margin: "0 0 12px 0", fontSize: "1.05rem", display: "flex", alignItems: "center", gap: 8 }}>
                  <AlertTriangleIcon size={18} /> À traiter
                </h3>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: "0.95rem" }}>
                  {cockpitData.orders.to_prepare > 0 && (
                    <Link href="/vendor/orders" style={{ color: "#856404", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
                      <PackageIcon size={16} /> <strong>{cockpitData.orders.to_prepare} commande(s)</strong> à préparer
                    </Link>
                  )}
                  {cockpitData.stock.out_of_stock > 0 && (
                    <Link href="/vendor/dashboard" style={{ color: "#856404", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
                      <XCircleIcon size={16} /> <strong>{cockpitData.stock.out_of_stock} produit(s)</strong> en rupture
                    </Link>
                  )}
                  {cockpitData.stock.low_stock > 0 && (
                    <Link href="/vendor/dashboard" style={{ color: "#856404", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
                      <AlertTriangleIcon size={16} /> <strong>{cockpitData.stock.low_stock} produit(s)</strong> stock bas
                    </Link>
                  )}
                  {cockpitData.unansweredReviews > 0 && (
                    <Link href="/vendor/dashboard" style={{ color: "#856404", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
                      <MessageIcon size={16} /> <strong>{cockpitData.unansweredReviews} avis</strong> sans réponse
                    </Link>
                  )}
                </div>
              </div>
            )}

            {cockpitData.topProducts.length > 0 && (
              <div className="va-card">
                <h3 style={{ margin: "0 0 12px 0", fontSize: "1.05rem", display: "flex", alignItems: "center", gap: 8 }}>
                  <BadgeCheckIcon size={18} /> Top 3 produits du mois
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {cockpitData.topProducts.map((p, i) => (
                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 8, borderBottom: i < 2 ? "1px solid #eee" : "none" }}>
                      <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
                        <MedalBadge rank={i + 1} />
                        <div>
                          <strong>{p.name}</strong>
                          <div style={{ fontSize: "0.85rem", color: "#666" }}>{p.units_sold} unité(s) vendue(s)</div>
                        </div>
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
        <VendorInsights />

        <div className="vendor-stats-grid">
          <div className="vendor-stat-card">
            <div className="vendor-stat-icon" style={{ color: "var(--gold-600)" }}><PackageIcon size={28} /></div>
            <div className="vendor-stat-value">{products.length}</div>
            <div className="vendor-stat-label">Produits</div>
          </div>
          <div className="vendor-stat-card">
            <div className="vendor-stat-icon" style={{ color: "var(--gold-600)" }}><BarChartIcon size={28} /></div>
            <div className="vendor-stat-value">{totalStock}</div>
            <div className="vendor-stat-label">Unités en stock</div>
          </div>
          <div className="vendor-stat-card">
            <div className="vendor-stat-icon" style={{ color: lowStockCount > 0 ? "var(--bissap-600)" : "var(--gold-600)" }}><AlertTriangleIcon size={28} /></div>
            <div className="vendor-stat-value" style={{ color: lowStockCount > 0 ? "var(--bissap-600)" : "inherit" }}>
              {lowStockCount}
            </div>
            <div className="vendor-stat-label">Stock faible</div>
          </div>
          <div className="vendor-stat-card">
            <div className="vendor-stat-icon" style={{ color: "var(--bissap-600)" }}><XCircleIcon size={28} /></div>
            <div className="vendor-stat-value">{outOfStockCount}</div>
            <div className="vendor-stat-label">Rupture</div>
          </div>
        </div>

        <div className="vendor-quick-links">
          <Link href="/vendor/revenue" className="vendor-quick-link">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <WalletIcon size={20} style={{ color: "var(--gold-600)" }} /> <strong>Revenus</strong>
            </div>
            <span>Ventes, commission, solde</span>
          </Link>
          <Link href="/vendor/account" className="vendor-quick-link">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <StoreIcon size={20} style={{ color: "var(--gold-600)" }} /> <strong>Mon compte</strong>
            </div>
            <span>Mobile Money, ville</span>
          </Link>
        </div>

        <div className="vendor-filters">
          <button className={`vendor-filter-btn ${activeFilter === "all" ? "active" : ""}`} onClick={() => setActiveFilter("all")}>
            Tous ({products.length})
          </button>
          <button className={`vendor-filter-btn ${activeFilter === "low" ? "active" : ""}`} onClick={() => setActiveFilter("low")}>
            Stock faible ({lowStockCount})
          </button>
          <button className={`vendor-filter-btn ${activeFilter === "out" ? "active" : ""}`} onClick={() => setActiveFilter("out")}>
            Rupture ({outOfStockCount})
          </button>
        </div>

        <div className="vendor-actions-bar">
          <button className="btn btn-primary vendor-add-btn" onClick={() => setShowForm((s) => !s)} disabled={!isActive}>
            {showForm ? <><XCircleIcon size={16} /> Annuler</> : <><PlusIcon size={16} /> Ajouter un produit</>}
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
                  <input id="p-name" required value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} placeholder="Ex : Sac à main artisanal" />
                </div>
                <div>
                  <label htmlFor="p-sku">Référence (SKU)</label>
                  <input id="p-sku" value={newProduct.sku} onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })} placeholder="Optionnel" />
                </div>
                <div>
                  <label htmlFor="p-brand">Marque</label>
                  <input id="p-brand" value={newProduct.brand} onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })} placeholder="Ex : Samsung, Nike..." />
                </div>
              </div>
              <div className="form-row">
                <div>
                  <label htmlFor="p-price">Prix (FCFA)</label>
                  <input id="p-price" type="number" min="0" required value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} placeholder="15000" />
                </div>
                <div>
                  <label htmlFor="p-compare-price">Prix barré (FCFA)</label>
                  <input id="p-compare-price" type="number" min="0" value={newProduct.compareAtPrice} onChange={(e) => setNewProduct({ ...newProduct, compareAtPrice: e.target.value })} placeholder="Ex : 20000" />
                </div>
                <div>
                  <label htmlFor="p-stock">Stock initial</label>
                  <input id="p-stock" type="number" min="0" value={newProduct.stockQuantity} onChange={(e) => setNewProduct({ ...newProduct, stockQuantity: e.target.value })} placeholder="0" />
                </div>
              </div>
              <div className="form-row">
                <div>
                  <label htmlFor="p-category">Catégorie</label>
                  <select id="p-category" value={selectedParentCat} onChange={(e) => { setSelectedParentCat(e.target.value); setNewProduct({ ...newProduct, categoryId: "" }); }}>
                    <option value="">— Choisir —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="p-subcategory">Sous-catégorie</label>
                  <select id="p-subcategory" value={newProduct.categoryId} onChange={(e) => setNewProduct({ ...newProduct, categoryId: e.target.value })} disabled={!selectedParentCat}>
                    <option value="">— Choisir —</option>
                    {subcategoriesForSelectedParent.map((sc) => (
                      <option key={sc.id} value={sc.id}>{sc.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="p-condition">État</label>
                  <select id="p-condition" value={newProduct.condition} onChange={(e) => setNewProduct({ ...newProduct, condition: e.target.value })}>
                    <option value="neuf">Neuf</option>
                    <option value="quasi_neuf">Quasi neuf</option>
                    <option value="occasion">Occasion</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div>
                  <label htmlFor="p-images">Photos (jusqu'à 5)</label>
                  <input id="p-images" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleFileSelect} />
                  {previewUrls.length > 0 && (
                    <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                      {previewUrls.map((url, idx) => (
                        <img key={idx} src={url} alt={`Aperçu ${idx + 1}`} style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 6, border: "1px solid var(--sand-200)" }} />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div>
                  <label htmlFor="p-image-url">Ou coller une URL d'image</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input id="p-image-url" type="text" value={imageUrlInput} onChange={(e) => setImageUrlInput(e.target.value)} placeholder="https://exemple.com/mon-image.jpg" />
                    <button type="button" className="btn btn-ghost" onClick={handleAddImageUrl}>Ajouter</button>
                  </div>
                  {manualImageUrls.length > 0 && (
                    <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                      {manualImageUrls.map((url, idx) => (
                        <div key={idx} style={{ position: "relative" }}>
                          <img src={url} alt={`URL ${idx + 1}`} style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 6, border: "1px solid var(--sand-200)" }} />
                          <button type="button" onClick={() => handleRemoveImageUrl(idx)} style={{ position: "absolute", top: -6, right: -6, background: "var(--bissap-600)", color: "white", border: "none", borderRadius: "50%", width: 20, height: 20, fontSize: "0.7rem", cursor: "pointer" }}>×</button>
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

        <div className="vendor-products-section">
          <h2 id="vendor-products-section">Mes produits ({filteredProducts.length})</h2>

          {loading ? (
            <p>Chargement...</p>
          ) : filteredProducts.length === 0 ? (
            <div className="empty-state">
              <div className="glyph" style={{ display: "inline-flex", color: "var(--gold-600)" }}><PackageIcon size={48} /></div>
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
                          <div className="vendor-product-placeholder" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#999" }}>
                            <PackageIcon size={40} />
                          </div>
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
                          {isFlashActive && <span className="vendor-badge vendor-badge-flash">Flash</span>}
                          {p.is_sponsored && <span className="vendor-badge vendor-badge-sponsored">Sponsorisé</span>}
                        </div>
                      </div>
                      <div className="vendor-product-expand">{isExpanded ? "▲" : "▼"}</div>
                    </div>

                    {isExpanded && (
                      <div className="vendor-product-actions">
                        <div className="vendor-action-group">
                          <label>Ajuster le stock</label>
                          <div className="vendor-action-row">
                            <input type="number" min="0" placeholder="Qté" value={adjustments[p.id] || ""} onChange={(e) => setAdjustments((a) => ({ ...a, [p.id]: e.target.value }))} />
                            <button className="btn btn-primary" onClick={() => handleAdjust(p.id, "add")} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <PlusIcon size={14} /> Réappro
                            </button>
                            <button className="btn btn-ghost" onClick={() => handleAdjust(p.id, "remove")} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <MinusIcon size={14} /> Retirer
                            </button>
                          </div>
                        </div>

                        <div className="vendor-action-group">
                          <label>Prix barré (FCFA)</label>
                          <div className="vendor-action-row">
                            <input type="number" min="0" placeholder="Aucun" value={discountInputs[p.id] !== undefined ? discountInputs[p.id] : p.compare_at_price || ""} onChange={(e) => setDiscountInputs((d) => ({ ...d, [p.id]: e.target.value }))} />
                            <button className="btn btn-primary" onClick={() => handleSaveCompareAtPrice(p.id)}>Enregistrer</button>
                          </div>
                        </div>

                        <div className="vendor-action-group">
                          <label>Vente flash</label>
                          {isFlashActive ? (
                            <div className="vendor-action-row">
                              <span className="vendor-flash-active">
                                Jusqu'au {new Date(p.flash_sale_ends_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                              </span>
                              <button className="btn btn-ghost" onClick={() => handleDeactivateFlashSale(p.id)}>Arrêter</button>
                            </div>
                          ) : (
                            <div className="vendor-action-row">
                              <input type="datetime-local" value={flashSaleInputs[p.id] || ""} onChange={(e) => setFlashSaleInputs((f) => ({ ...f, [p.id]: e.target.value }))} />
                              <button className="btn btn-primary" onClick={() => handleActivateFlashSale(p.id)}>Activer</button>
                            </div>
                          )}
                        </div>

                        <div className="vendor-action-group">
                          <label>Sponsoring <a href="/sponsoring" style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--gold-600)" }}>(voir les tarifs)</a></label>
                          {p.is_sponsored && p.sponsored_until && new Date(p.sponsored_until) > new Date() ? (
                            <div className="vendor-action-row">
                              <span className="vendor-sponsored-active">Actif jusqu'au {new Date(p.sponsored_until).toLocaleDateString("fr-FR")}</span>
                            </div>
                          ) : sponsorRequests[p.id] === "paid" ? (
                            <div className="vendor-action-row">
                              <span className="vendor-sponsored-pending" style={{ color: "var(--gold-600)", fontWeight: 700 }}>💳 Paiement reçu — activation en cours</span>
                            </div>
                          ) : sponsorRequests[p.id] === "paid" ? (
                            <div className="vendor-action-row">
                              <span className="vendor-sponsored-pending" style={{ color: "var(--gold-600)", fontWeight: 700 }}>💳 Paiement reçu — activation en cours</span>
                            </div>
                          ) : sponsorRequests[p.id] === "paid" ? (
                            <div className="vendor-action-row">
                              <span className="vendor-sponsored-pending" style={{ color: "var(--gold-600)", fontWeight: 700 }}>💳 Paiement reçu — activation en cours</span>
                            </div>
                          ) : sponsorRequests[p.id] === "pending" ? (
                            <div className="vendor-action-row">
                              <span className="vendor-sponsored-pending">Demande envoyée</span>
                            </div>
                          ) : sponsorPickerFor === p.id ? (
                            <div className="vendor-action-row" style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, background: "#f9fafb", borderRadius: 8, border: "1px solid var(--border)" }}>
                              <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 600 }}>Choisissez un pack de sponsoring :</p>
                              {[
                                { id: "1m", label: "1 mois", days: 30, price: 2000 },
                                { id: "3m", label: "3 mois", days: 90, price: 5000 },
                                { id: "6m", label: "6 mois ⭐", days: 180, price: 10000, popular: true },
                                { id: "12m", label: "12 mois 💎", days: 365, price: 18000, best: true },
                              ].map((pack) => (
                                <label key={pack.id} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: 6, borderRadius: 6, background: sponsorPickerDays === pack.days ? "var(--gold-50, #fffbeb)" : "white", border: sponsorPickerDays === pack.days ? "2px solid var(--gold-500)" : "1px solid var(--border)" }}>
                                  <input type="radio" name={`sponsor-${p.id}`} checked={sponsorPickerDays === pack.days} onChange={() => setSponsorPickerDays(pack.days)} style={{ width: 16, height: 16, flex: "none", accentColor: "var(--gold-600)" }} />
                                  <span style={{ flex: 1, fontSize: "0.85rem", fontWeight: pack.popular || pack.best ? 700 : 400 }}>{pack.label}</span>
                                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--gold-600)" }}>{pack.price.toLocaleString("fr-FR")} FCFA</span>
                                </label>
                              ))}
                              <div style={{ marginTop: 10, padding: 10, background: "#fff", borderRadius: 8, border: "1px solid var(--border)" }}>
                                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: 4 }}>Numéro Mobile Money (Orange/Moov)</label>
                                <input
                                  type="tel"
                                  placeholder="70123456"
                                  value={sponsorPhone}
                                  onChange={(e) => setSponsorPhone(e.target.value)}
                                  disabled={sponsorBusy === p.id}
                                  style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: "0.9rem" }}
                                />
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                                <button className="btn btn-primary" onClick={() => handleRequestSponsor(p.id, sponsorPickerDays, "now")} disabled={sponsorBusy === p.id} style={{ flex: "none", width: "100%" }}>
                                  {sponsorPaying ? "Redirection Mobile Money..." : `💳 Payer maintenant — ${sponsorPickerDays}j`}
                                </button>
                                <button className="btn btn-ghost" onClick={() => handleRequestSponsor(p.id, sponsorPickerDays, "later")} disabled={sponsorBusy === p.id} style={{ flex: "none", width: "100%" }}>
                                  Payer plus tard (espèces/virement)
                                </button>
                                <button className="btn btn-ghost" onClick={() => setSponsorPickerFor(null)} disabled={sponsorBusy === p.id} style={{ fontSize: "0.8rem" }}>Annuler</button>
                              </div>
                            </div>
                          ) : (
                            <div className="vendor-action-row">
                              <button className="btn btn-ghost" onClick={() => { setSponsorPickerFor(p.id); setSponsorPickerDays(180); }} disabled={sponsorBusy === p.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                {sponsorBusy === p.id ? "..." : <><BarChartIcon size={14} /> Sponsoriser</>}
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="vendor-action-group">
                          <button className="btn btn-ghost" onClick={() => { navigator.share ? navigator.share({ title: p.name, text: p.name + " — " + Number(p.price).toLocaleString("fr-FR") + " FCFA sur Kimoxa", url: window.location.origin + "/shop/" + p.id }) : navigator.clipboard.writeText(window.location.origin + "/shop/" + p.id).then(() => toast.success("Lien copié !")); }} style={{ display: "flex", alignItems: "center", gap: 4 }}>📲 Partager</button>
              <button className="btn btn-danger" onClick={() => handleDeleteProduct(p.id, p.name)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <TrashIcon size={14} /> Supprimer le produit
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
