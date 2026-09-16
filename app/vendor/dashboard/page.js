"use client";

// app/vendor/dashboard/page.js — RÉÉCRITURE PRO (dev full-stack)
// Design system : app/dashboard.css
// API inchangées (identiques à l'ancienne version) :
//   /api/vendor/stock (GET/POST/PATCH/DELETE) · /api/vendor/upload
//   /api/vendor/shop (GET/PATCH) · /api/vendor/dashboard · /api/vendor/earnings
//   /api/categories · /api/vendor/products/[id]/sponsor(+ /pay)
//   /api/conversations/unread-count · /api/auth/me · /api/auth/logout
//
// Nettoyages par rapport à l'ancien fichier (55 Ko) :
// - code mort retiré : promoForm/loadPromos/createPromo/deletePromo jamais
//   rendus, branche sponsorRequests === "paid" tripliée (jamais atteinte),
//   états lowStockAlertDismissed/newOrdersAlertDismissed jamais lus
// - ~350 objets de style inline déplacés dans app/dashboard.css
// - tous les flux fonctionnels sont inchangés

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
  CheckCircleIcon, InfoIcon, RotateCcwIcon, MinusIcon, ArrowRightIcon,
} from "@/app/components/Icons";
import "../../dashboard.css";

const DOC_LABELS = { cni: "CNI", passeport: "Passeport", permis: "Permis de conduire" };
const SPONSOR_PACKS = [
  { id: "1m", label: "1 mois", days: 30, price: 2000 },
  { id: "3m", label: "3 mois", days: 90, price: 5000 },
  { id: "6m", label: "6 mois ⭐", days: 180, price: 10000, popular: true },
  { id: "12m", label: "12 mois 💎", days: 365, price: 18000, best: true },
];
const fmt = (n) => Number(n || 0).toLocaleString("fr-FR");

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
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [sponsorRequests, setSponsorRequests] = useState({});
  const [sponsorBusy, setSponsorBusy] = useState(null);
  const [sponsorPickerFor, setSponsorPickerFor] = useState(null);
  const [sponsorPickerDays, setSponsorPickerDays] = useState(180);
  const [sponsorPhone, setSponsorPhone] = useState("");
  const [sponsorPaying, setSponsorPaying] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [expandedProduct, setExpandedProduct] = useState(null);
  const [cockpitData, setCockpitData] = useState(null);

  // KYC
  const [resubmitDocType, setResubmitDocType] = useState("cni");
  const [resubmitDocNumber, setResubmitDocNumber] = useState("");
  const [resubmitError, setResubmitError] = useState("");
  const [resubmitting, setResubmitting] = useState(false);
  const [docDataUrl, setDocDataUrl] = useState("");
  const [docBusy, setDocBusy] = useState(false);

  // Nouveau produit
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
    function loadCockpit() {
      fetch("/api/vendor/dashboard")
        .then((r) => (r.ok ? r.json() : null))
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
      fetch("/api/vendor/shop").then((r) => r.json()).then((d) => {
        if (d.shop) {
          setShop(d.shop);
          setResubmitDocType(d.shop.id_document_type || "cni");
          setResubmitDocNumber(d.shop.id_document_number || "");
        }
      });
    });
  }, [loadStock, loadNewOrdersCount, router]);

  /* ------------------------------------------------------- IMAGES PRODUIT */
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

  /* ------------------------------------------------------------ PRODUIT CRUD */
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

  async function handleDeleteProduct(productId, productName) {
    if (!window.confirm(`Supprimer définitivement "${productName}" ? Cette action est irréversible.`)) return;
    setError(""); setSuccess("");
    const res = await fetch(`/api/vendor/stock/${productId}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Erreur lors de la suppression du produit."); return; }
    setSuccess(`Produit "${data.name}" supprimé.`);
    loadStock();
  }

  /* ------------------------------------------------------------------- KYC */
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

  /* -------------------------------------------------------------- SPONSORING */
  async function handleRequestSponsor(productId, durationDays, mode) {
    setError("");
    setSponsorBusy(productId);

    if (mode === "later") {
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

  /* --------------------------------------------------------------- DÉRIVÉS */
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
      <label className="doc-upload-zone" htmlFor="vendor-doc-file">
        {docDataUrl ? (
          <>
            <img src={docDataUrl} alt="Aperçu de la pièce" className="doc-upload-preview" />
            <div className="doc-upload-hint" style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
              <CheckCircleIcon size={16} /> Photo ajoutée — cliquez pour remplacer
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
              <UploadIcon size={32} style={{ color: "var(--gold)" }} />
            </div>
            <strong>{docBusy ? "Traitement..." : "Photo de la pièce (recto) *"}</strong>
            <div className="doc-upload-hint">JPG, PNG ou WEBP · 8 Mo max · image nette et lisible</div>
          </>
        )}
      </label>
      <input
        id="vendor-doc-file" type="file" accept="image/jpeg,image/png,image/webp"
        style={{ display: "none" }} onChange={handleDocFile}
      />
      <div style={{ justifyContent: "flex-start", color: "var(--text-faint)", paddingTop: 10, fontSize: "0.75rem", display: "flex", alignItems: "center", gap: 6 }}>
        <LockIcon size={14} />
        <span>Vos données sont chiffrées et utilisées uniquement pour la vérification.</span>
      </div>
    </>
  );

  const kycForm = (submitLabel) => (
    <form onSubmit={handleResubmitDocuments}>
      <div className="form-row">
        <div>
          <label htmlFor="vendor-doc-type">Type de pièce *</label>
          <select id="vendor-doc-type" value={resubmitDocType} onChange={(e) => setResubmitDocType(e.target.value)}>
            <option value="cni">Carte Nationale d'Identité (CNI)</option>
            <option value="passeport">Passeport</option>
            <option value="permis">Permis de conduire</option>
          </select>
        </div>
        <div>
          <label htmlFor="vendor-doc-number">Numéro de la pièce *</label>
          <input id="vendor-doc-number" required value={resubmitDocNumber} onChange={(e) => setResubmitDocNumber(e.target.value)} placeholder="Ex : B01234567" />
        </div>
      </div>
      {DocUploadZone}
      <button type="submit" className="btn btn-primary" disabled={resubmitting || docBusy} style={{ marginTop: 10 }}>
        {resubmitting ? "Envoi..." : submitLabel}
      </button>
    </form>
  );

  const maxTopRevenue = Math.max(1, ...((cockpitData?.topProducts) || []).map((p) => Number(p.revenue) || 0));

  return (
    <div>
      <div className="dash-topbar">
        <div className="dash-topbar-brand">
          <KimoxaLogo light size={20} />
          <span className="dash-topbar-role">Vendeur</span>
        </div>
        <div className="dash-topbar-actions">
          <Link href="/messages" className="tb-btn" aria-label="Messages">
            <MessageIcon size={18} />
            {unreadMessages > 0 && <span className="tb-badge">{unreadMessages > 9 ? "9+" : unreadMessages}</span>}
          </Link>
          <Link href="/vendor/orders" className="tb-btn" aria-label="Commandes reçues">
            <PackageIcon size={18} />
            {newOrdersCount > 0 && <span className="tb-badge">{newOrdersCount > 9 ? "9+" : newOrdersCount}</span>}
          </Link>
          {lowStockCount > 0 && (
            <button
              className="tb-btn"
              onClick={() => { setActiveFilter("low"); document.getElementById("vendor-products-section")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
              aria-label="Stock faible" title="Stock faible"
            >
              <AlertTriangleIcon size={18} />
              <span className="tb-badge">{lowStockCount > 9 ? "9+" : lowStockCount}</span>
            </button>
          )}
          <Link href="/vendor/account" className="tb-btn" aria-label="Options de livraison" title="Options de livraison">
            <TruckIcon size={18} />
          </Link>
          <button className="tb-logout" onClick={handleLogout}>Déconnexion</button>
        </div>
      </div>
      <div className="woven-strip" />

      <div className="dash-wrap">
        <div className="dash-head">
          <div>
            <h1 className="dash-title">Tableau de bord</h1>
            <p className="dash-sub">{user ? `Bienvenue, ${user.full_name}` : ""}</p>
          </div>
          {shop && (
            <ShareBar
              title={shop.name + " — Ma boutique Kimoxa"}
              price={0}
              url={typeof window !== "undefined" ? window.location.origin + "/boutique/" + shop.id : ""}
            />
          )}
        </div>

        {/* ================= KYC ================= */}
        {shop && shop.status === "pending" && !shop.id_document_type && (
          <div className="panel" style={{ marginBottom: 20, borderColor: "var(--warning)", background: "var(--warning-soft)" }}>
            <div className="panel-body">
              <h3 className="panel-title" style={{ marginBottom: 8 }}>
                <CreditCardIcon size={18} style={{ color: "var(--warning)" }} /> Vérifiez votre identité pour activer votre boutique
              </h3>
              <p style={{ marginTop: 0 }}>
                Votre compte vendeur est créé ! Soumettez votre pièce d'identité pour commencer à vendre
                <strong> sans aucune limite</strong> de produits ou de gains.
              </p>
              {resubmitError && <div className="error-box">{resubmitError}</div>}
              {kycForm("Soumettre pour vérification")}
            </div>
          </div>
        )}

        {shop && shop.status === "pending" && shop.id_document_type && (
          <div className="panel" style={{ marginBottom: 20, background: "var(--info-soft)", borderColor: "transparent" }}>
            <div className="panel-body" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <ClockIcon size={18} style={{ color: "var(--info)", flexShrink: 0 }} />
              <span style={{ fontSize: "0.9rem" }}>
                <strong>Boutique en attente de vérification.</strong> Notre équipe contrôle votre
                {DOC_LABELS[shop.id_document_type] || shop.id_document_type} n° {shop.id_document_number}
                — validation sous 24h.
              </span>
            </div>
          </div>
        )}

        {shop && shop.status === "suspended" && (
          <div className="panel" style={{ marginBottom: 20, background: "var(--danger-soft)", borderColor: "transparent" }}>
            <div className="panel-body" style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--danger)" }}>
              <XCircleIcon size={18} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: "0.9rem" }}>
                <strong>Boutique suspendue.</strong> Contactez le support Kimoxa pour plus d'informations.
              </span>
            </div>
          </div>
        )}

        {shop && shop.status === "rejected" && (
          <div className="panel" style={{ marginBottom: 20, borderColor: "var(--danger)" }}>
            <div className="panel-body">
              <h3 className="panel-title" style={{ color: "var(--danger)", marginBottom: 8 }}>
                <XCircleIcon size={18} /> Demande de compte vendeur non validée
              </h3>
              <p style={{ marginTop: 0 }}>Motif : {shop.rejection_reason || "Non précisé."}</p>
              <p>Corrigez les informations de votre pièce d'identité ci-dessous pour une nouvelle vérification.</p>
              {resubmitError && <div className="error-box">{resubmitError}</div>}
              {kycForm("Resoumettre pour vérification")}
            </div>
          </div>
        )}

        {error && <div className="error-box">{error}</div>}
        {success && <div className="success-box">{success}</div>}

        {/* ================= COCKPIT ================= */}
        {cockpitData && (
          <div className="dash-section">
            <div className="dash-section-label">Activité</div>
            <div className="kpi-grid">
              <div className="kpi">
                <div className="kpi-top">
                  <span className="kpi-icon"><WalletIcon size={22} /></span>
                  <span className={`kpi-delta ${cockpitData.revenue.today_delta >= 0 ? "kpi-delta--up" : "kpi-delta--down"}`}>
                    {cockpitData.revenue.today_delta >= 0 ? "▲" : "▼"} {Math.abs(cockpitData.revenue.today_delta)}%
                  </span>
                </div>
                <div className="kpi-value">{fmt(cockpitData.revenue.today)} F</div>
                <div className="kpi-label">Aujourd'hui</div>
              </div>
              <div className="kpi">
                <div className="kpi-top">
                  <span className="kpi-icon"><BarChartIcon size={22} /></span>
                  <span className={`kpi-delta ${cockpitData.revenue.week_delta >= 0 ? "kpi-delta--up" : "kpi-delta--down"}`}>
                    {cockpitData.revenue.week_delta >= 0 ? "+" : ""}{cockpitData.revenue.week_delta}%
                  </span>
                </div>
                <div className="kpi-value">{fmt(cockpitData.revenue.week)} F</div>
                <div className="kpi-label">Cette semaine</div>
              </div>
              <div className="kpi">
                <div className="kpi-top">
                  <span className="kpi-icon"><ClockIcon size={22} /></span>
                  <span className={`kpi-delta ${cockpitData.revenue.month_delta >= 0 ? "kpi-delta--up" : "kpi-delta--down"}`}>
                    {cockpitData.revenue.month_delta >= 0 ? "+" : ""}{cockpitData.revenue.month_delta}%
                  </span>
                </div>
                <div className="kpi-value">{fmt(cockpitData.revenue.month)} F</div>
                <div className="kpi-label">Ce mois</div>
              </div>
              <div className="kpi">
                <div className="kpi-top">
                  <span className="kpi-icon"><StarIcon size={22} /></span>
                </div>
                <div className="kpi-value">{Number(cockpitData.rating.avg_rating || 0).toFixed(1)} / 5</div>
                <div className="kpi-label">{cockpitData.rating.review_count} avis</div>
              </div>
            </div>
          </div>
        )}

        {/* ================= À TRAITER ================= */}
        {cockpitData && (cockpitData.orders.to_prepare > 0 || cockpitData.stock.out_of_stock > 0 || cockpitData.stock.low_stock > 0 || cockpitData.unansweredReviews > 0) && (
          <div className="dash-section">
            <div className="dash-section-label">À traiter</div>
            <div className="queue">
              {cockpitData.orders.to_prepare > 0 && (
                <Link href="/vendor/orders" className="queue-item" style={{ "--q-color": "var(--cta)" }}>
                  <span className="queue-icon"><PackageIcon size={18} /></span>
                  <span className="queue-text">
                    <span className="queue-label">{cockpitData.orders.to_prepare} commande(s) à préparer</span>
                    <span className="queue-detail">Ouvrir les commandes reçues</span>
                  </span>
                  <span className="queue-arrow">→</span>
                </Link>
              )}
              {cockpitData.stock.out_of_stock > 0 && (
                <button className="queue-item" style={{ "--q-color": "var(--danger)", width: "100%", textAlign: "left", cursor: "pointer", font: "inherit" }}
                  onClick={() => { setActiveFilter("out"); document.getElementById("vendor-products-section")?.scrollIntoView({ behavior: "smooth" }); }}>
                  <span className="queue-icon"><XCircleIcon size={18} /></span>
                  <span className="queue-text">
                    <span className="queue-label">{cockpitData.stock.out_of_stock} produit(s) en rupture</span>
                    <span className="queue-detail">Réapprovisionner pour rester visible</span>
                  </span>
                  <span className="queue-arrow">→</span>
                </button>
              )}
              {cockpitData.stock.low_stock > 0 && (
                <button className="queue-item" style={{ "--q-color": "var(--warning)", width: "100%", textAlign: "left", cursor: "pointer", font: "inherit" }}
                  onClick={() => { setActiveFilter("low"); document.getElementById("vendor-products-section")?.scrollIntoView({ behavior: "smooth" }); }}>
                  <span className="queue-icon"><AlertTriangleIcon size={18} /></span>
                  <span className="queue-text">
                    <span className="queue-label">{cockpitData.stock.low_stock} produit(s) stock bas</span>
                    <span className="queue-detail">Seuil d'alerte atteint</span>
                  </span>
                  <span className="queue-arrow">→</span>
                </button>
              )}
              {cockpitData.unansweredReviews > 0 && (
                <div className="queue-item" style={{ "--q-color": "var(--info)" }}>
                  <span className="queue-icon"><MessageIcon size={18} /></span>
                  <span className="queue-text">
                    <span className="queue-label">{cockpitData.unansweredReviews} avis sans réponse</span>
                    <span className="queue-detail">Répondre booste votre note</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TOP PRODUITS ================= */}
        {cockpitData && cockpitData.topProducts.length > 0 && (
          <div className="dash-section">
            <div className="dash-section-label">Top 3 produits du mois</div>
            <div className="panel">
              <div className="panel-body">
                {cockpitData.topProducts.map((p, i) => (
                  <div className="rank-row" key={p.id}>
                    <span className={`medal medal--${i + 1}`}>{i + 1}</span>
                    <div className="rank-main">
                      <span className="rank-name">{p.name}</span>
                      <span className="rank-detail">{fmt(p.units_sold)} unité(s) vendue(s)</span>
                      <div className="rank-bar">
                        <div className="rank-bar-fill" style={{ width: `${Math.max(4, Math.round((Number(p.revenue) / maxTopRevenue) * 100))}%` }} />
                      </div>
                    </div>
                    <span className="rank-amount">{fmt(p.revenue)} F</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= ANALYTIQUE ================= */}
        <div className="dash-section">
          <div className="dash-section-label">Analytique</div>
          <VendorAnalytics />
          <VendorInsights />
        </div>

        {/* ================= STOCK ================= */}
        <div className="dash-section">
          <div className="dash-section-label">Inventaire</div>
          <div className="kpi-grid">
            <div className="kpi">
              <div className="kpi-top"><span className="kpi-icon"><PackageIcon size={22} /></span></div>
              <div className="kpi-value">{products.length}</div>
              <div className="kpi-label">Produits</div>
            </div>
            <div className="kpi">
              <div className="kpi-top"><span className="kpi-icon"><BarChartIcon size={22} /></span></div>
              <div className="kpi-value">{totalStock}</div>
              <div className="kpi-label">Unités en stock</div>
            </div>
            <div className={`kpi ${lowStockCount > 0 ? "kpi--alert" : ""}`}>
              <div className="kpi-top"><span className="kpi-icon"><AlertTriangleIcon size={22} /></span></div>
              <div className="kpi-value">{lowStockCount}</div>
              <div className="kpi-label">Stock faible</div>
            </div>
            <div className="kpi">
              <div className="kpi-top"><span className="kpi-icon" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}><XCircleIcon size={22} /></span></div>
              <div className="kpi-value">{outOfStockCount}</div>
              <div className="kpi-label">Rupture</div>
            </div>
          </div>
        </div>

        {/* ================= ACCÈS RAPIDES ================= */}
        <div className="dash-section">
          <div className="dash-section-label">Accès rapides</div>
          <div className="quick-grid">
            <Link href="/vendor/revenue" className="panel" style={{ textDecoration: "none", color: "inherit" }}>
              <div className="panel-body" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className="kpi-icon"><WalletIcon size={20} /></span>
                <span style={{ flex: 1 }}>
                  <strong style={{ display: "block" }}>Revenus</strong>
                  <span style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2 }}>
                    Ventes, commission, solde
                  </span>
                </span>
                <ArrowRightIcon size={18} style={{ color: "var(--gold)" }} />
              </div>
            </Link>
            <Link href="/vendor/account" className="panel" style={{ textDecoration: "none", color: "inherit" }}>
              <div className="panel-body" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className="kpi-icon"><StoreIcon size={20} /></span>
                <span style={{ flex: 1 }}>
                  <strong style={{ display: "block" }}>Mon compte</strong>
                  <span style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2 }}>
                    Mobile Money, ville, livraison
                  </span>
                </span>
                <ArrowRightIcon size={18} style={{ color: "var(--gold)" }} />
              </div>
            </Link>
          </div>
        </div>

        {/* ================= PRODUITS ================= */}
        <div className="dash-section" id="vendor-products-section">
          <div className="dash-section-label">
            Mes produits ({filteredProducts.length})
          </div>

          <div className="ftabs">
            <button className={`ftab ${activeFilter === "all" ? "active" : ""}`} onClick={() => setActiveFilter("all")}>
              Tous <span className="ftab-count">{products.length}</span>
            </button>
            <button className={`ftab ${activeFilter === "low" ? "active" : ""}`} onClick={() => setActiveFilter("low")}>
              Stock faible <span className="ftab-count">{lowStockCount}</span>
            </button>
            <button className={`ftab ${activeFilter === "out" ? "active" : ""}`} onClick={() => setActiveFilter("out")}>
              Rupture <span className="ftab-count">{outOfStockCount}</span>
            </button>
            <button className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }} onClick={() => setShowForm((s) => !s)} disabled={!isActive}>
              {showForm ? <><XCircleIcon size={14} /> Annuler</> : <><PlusIcon size={14} /> Ajouter un produit</>}
            </button>
          </div>

          {!isActive && (
            <p style={{ fontSize: "0.85rem", color: "var(--text-faint)", marginBottom: 16 }}>
              Vous pourrez ajouter des produits dès que votre boutique sera validée par notre équipe.
            </p>
          )}

          {showForm && isActive && (
            <div className="panel" style={{ marginBottom: 20 }}>
              <div className="panel-head"><h3 className="panel-title"><PlusIcon size={18} /> Nouveau produit</h3></div>
              <div className="panel-body">
                <form onSubmit={handleCreateProduct}>
                  <div className="form-grid">
                    <div className="pfield">
                      <label htmlFor="p-name">Nom du produit</label>
                      <input id="p-name" required value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} placeholder="Ex : Sac à main artisanal" />
                    </div>
                    <div className="pfield">
                      <label htmlFor="p-sku">Référence (SKU)</label>
                      <input id="p-sku" value={newProduct.sku} onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })} placeholder="Optionnel" />
                    </div>
                    <div className="pfield">
                      <label htmlFor="p-brand">Marque</label>
                      <input id="p-brand" value={newProduct.brand} onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })} placeholder="Ex : Samsung, Nike..." />
                    </div>
                    <div className="pfield">
                      <label htmlFor="p-price">Prix (FCFA)</label>
                      <input id="p-price" type="number" min="0" required value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} placeholder="15000" />
                    </div>
                    <div className="pfield">
                      <label htmlFor="p-compare-price">Prix barré (FCFA)</label>
                      <input id="p-compare-price" type="number" min="0" value={newProduct.compareAtPrice} onChange={(e) => setNewProduct({ ...newProduct, compareAtPrice: e.target.value })} placeholder="Ex : 20000" />
                    </div>
                    <div className="pfield">
                      <label htmlFor="p-stock">Stock initial</label>
                      <input id="p-stock" type="number" min="0" value={newProduct.stockQuantity} onChange={(e) => setNewProduct({ ...newProduct, stockQuantity: e.target.value })} placeholder="0" />
                    </div>
                    <div className="pfield">
                      <label htmlFor="p-category">Catégorie</label>
                      <select id="p-category" value={selectedParentCat} onChange={(e) => { setSelectedParentCat(e.target.value); setNewProduct({ ...newProduct, categoryId: "" }); }}>
                        <option value="">— Choisir —</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="pfield">
                      <label htmlFor="p-subcategory">Sous-catégorie</label>
                      <select id="p-subcategory" value={newProduct.categoryId} onChange={(e) => setNewProduct({ ...newProduct, categoryId: e.target.value })} disabled={!selectedParentCat}>
                        <option value="">— Choisir —</option>
                        {subcategoriesForSelectedParent.map((sc) => (
                          <option key={sc.id} value={sc.id}>{sc.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="pfield">
                      <label htmlFor="p-condition">État</label>
                      <select id="p-condition" value={newProduct.condition} onChange={(e) => setNewProduct({ ...newProduct, condition: e.target.value })}>
                        <option value="neuf">Neuf</option>
                        <option value="quasi_neuf">Quasi neuf</option>
                        <option value="occasion">Occasion</option>
                      </select>
                    </div>
                    <div className="pfield" style={{ gridColumn: "1 / -1" }}>
                      <label htmlFor="p-images">Photos (jusqu'à 5)</label>
                      <input id="p-images" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleFileSelect} />
                      {previewUrls.length > 0 && (
                        <div className="img-preview-row">
                          {previewUrls.map((url, idx) => (
                            <img key={idx} src={url} alt={`Aperçu ${idx + 1}`} className="img-preview" />
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="pfield" style={{ gridColumn: "1 / -1" }}>
                      <label htmlFor="p-image-url">Ou coller une URL d'image</label>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input id="p-image-url" type="text" value={imageUrlInput} onChange={(e) => setImageUrlInput(e.target.value)} placeholder="https://exemple.com/mon-image.jpg" />
                        <button type="button" className="btn btn-ghost" onClick={handleAddImageUrl}>Ajouter</button>
                      </div>
                      {manualImageUrls.length > 0 && (
                        <div className="img-preview-row">
                          {manualImageUrls.map((url, idx) => (
                            <div key={idx} style={{ position: "relative" }}>
                              <img src={url} alt={`URL ${idx + 1}`} className="img-preview" />
                              <button type="button" onClick={() => handleRemoveImageUrl(idx)} className="img-preview-remove">×</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={uploading} style={{ marginTop: 16 }}>
                    {uploading ? "Envoi des photos..." : "Enregistrer le produit"}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Liste produits */}
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[0, 1, 2].map((i) => <div key={i} className="skeleton" />)}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="empty-block">
              <PackageIcon size={48} />
              <p>Aucun produit {activeFilter !== "all" ? "pour ce filtre" : "pour l'instant"}. Ajoutez votre premier produit ci-dessus.</p>
            </div>
          ) : (
            <div className="prod-list">
              {filteredProducts.map((p) => {
                const isLow = p.stock_quantity <= p.low_stock_threshold;
                const isFlashActive = p.flash_sale_ends_at && new Date(p.flash_sale_ends_at) > new Date();
                const isExpanded = expandedProduct === p.id;
                const images = parseImages(p.images);

                return (
                  <div key={p.id} className="prod-card">
                    <div className="prod-head" onClick={() => setExpandedProduct(isExpanded ? null : p.id)}>
                      {images.length > 0 ? (
                        <img src={images[0]} alt={p.name} className="prod-thumb" />
                      ) : (
                        <span className="prod-thumb-placeholder"><PackageIcon size={28} /></span>
                      )}
                      <div className="prod-main">
                        <span className="prod-name">{p.name}</span>
                        <div className="prod-price-row">
                          <span className="prod-price">{Number(p.price).toLocaleString("fr-FR")} FCFA</span>
                          {p.compare_at_price && (
                            <span className="prod-old-price">{Number(p.compare_at_price).toLocaleString("fr-FR")} FCFA</span>
                          )}
                        </div>
                        <div className="prod-badges">
                          <span className={`prod-chip ${p.stock_quantity === 0 ? "prod-chip--out" : isLow ? "prod-chip--low" : "prod-chip--ok"}`}>
                            {p.stock_quantity} en stock
                          </span>
                          {isFlashActive && <span className="prod-chip prod-chip--flash">⚡ Flash</span>}
                          {p.is_sponsored && <span className="prod-chip prod-chip--gold">★ Sponsorisé</span>}
                        </div>
                      </div>
                      <span className="prod-caret">{isExpanded ? "▲ Réduire" : "▼ Gérer"}</span>
                    </div>

                    {isExpanded && (
                      <div className="prod-expand">
                        <div className="pfield">
                          <label>Ajuster le stock</label>
                          <div className="action-row">
                            <input type="number" min="0" placeholder="Qté" style={{ width: 90 }}
                              value={adjustments[p.id] || ""}
                              onChange={(e) => setAdjustments((a) => ({ ...a, [p.id]: e.target.value }))} />
                            <button className="btn btn-primary btn-sm" onClick={() => handleAdjust(p.id, "add")}>
                              <PlusIcon size={14} /> Réappro
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => handleAdjust(p.id, "remove")}>
                              <MinusIcon size={14} /> Retirer
                            </button>
                          </div>
                        </div>

                        <div className="pfield">
                          <label>Prix barré (FCFA)</label>
                          <div className="action-row">
                            <input type="number" min="0" placeholder="Aucun" style={{ width: 110 }}
                              value={discountInputs[p.id] !== undefined ? discountInputs[p.id] : p.compare_at_price || ""}
                              onChange={(e) => setDiscountInputs((d) => ({ ...d, [p.id]: e.target.value }))} />
                            <button className="btn btn-primary btn-sm" onClick={() => handleSaveCompareAtPrice(p.id)}>Enregistrer</button>
                          </div>
                        </div>

                        <div className="pfield">
                          <label>Vente flash</label>
                          {isFlashActive ? (
                            <div className="action-row">
                              <span className="action-note">
                                ⚡ Jusqu'au {new Date(p.flash_sale_ends_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                              </span>
                              <button className="btn btn-ghost btn-sm" onClick={() => handleDeactivateFlashSale(p.id)}>Arrêter</button>
                            </div>
                          ) : (
                            <div className="action-row">
                              <input type="datetime-local" style={{ flex: 1, minWidth: 180 }}
                                value={flashSaleInputs[p.id] || ""}
                                onChange={(e) => setFlashSaleInputs((f) => ({ ...f, [p.id]: e.target.value }))} />
                              <button className="btn btn-primary btn-sm" onClick={() => handleActivateFlashSale(p.id)}>Activer</button>
                            </div>
                          )}
                        </div>

                        <div className="pfield">
                          <label>
                            Sponsoring{" "}
                            <a href="/sponsoring" style={{ fontSize: "0.72rem", fontWeight: 600, color: "#8a6d1f" }}>(voir les tarifs)</a>
                          </label>
                          {p.is_sponsored && p.sponsored_until && new Date(p.sponsored_until) > new Date() ? (
                            <div className="action-row">
                              <span className="action-note" style={{ color: "#8a6d1f", fontWeight: 700 }}>
                                ★ Actif jusqu'au {new Date(p.sponsored_until).toLocaleDateString("fr-FR")}
                              </span>
                            </div>
                          ) : sponsorRequests[p.id] === "pending" ? (
                            <div className="action-row">
                              <span className="action-note" style={{ fontWeight: 700 }}>Demande envoyée — en attente de validation</span>
                            </div>
                          ) : sponsorPickerFor === p.id ? (
                            <div className="sponsor-picker">
                              <strong style={{ fontSize: "0.85rem" }}>Choisissez un pack de sponsoring :</strong>
                              {SPONSOR_PACKS.map((pack) => (
                                <label key={pack.id} className={`sponsor-pack ${sponsorPickerDays === pack.days ? "selected" : ""}`}>
                                  <input type="radio" name={`sponsor-${p.id}`} checked={sponsorPickerDays === pack.days}
                                    onChange={() => setSponsorPickerDays(pack.days)} />
                                  <span className="pack-label" style={{ fontWeight: pack.popular || pack.best ? 700 : 400 }}>{pack.label}</span>
                                  <span className="pack-price">{fmt(pack.price)} FCFA</span>
                                </label>
                              ))}
                              <div className="pfield" style={{ background: "var(--surface-raised)", padding: 10, borderRadius: 8 }}>
                                <label>Numéro Mobile Money (Orange/Moov)</label>
                                <input type="tel" placeholder="70123456" value={sponsorPhone}
                                  onChange={(e) => setSponsorPhone(e.target.value)} disabled={sponsorBusy === p.id} />
                              </div>
                              <button className="btn btn-primary" onClick={() => handleRequestSponsor(p.id, sponsorPickerDays, "now")} disabled={sponsorBusy === p.id}>
                                {sponsorPaying ? "Redirection Mobile Money..." : `💳 Payer maintenant — ${sponsorPickerDays}j`}
                              </button>
                              <button className="btn btn-ghost" onClick={() => handleRequestSponsor(p.id, sponsorPickerDays, "later")} disabled={sponsorBusy === p.id}>
                                Payer plus tard (espèces/virement)
                              </button>
                              <button className="btn btn-ghost btn-sm" onClick={() => setSponsorPickerFor(null)} disabled={sponsorBusy === p.id}>Annuler</button>
                            </div>
                          ) : (
                            <div className="action-row">
                              <button className="btn btn-ghost btn-sm" onClick={() => { setSponsorPickerFor(p.id); setSponsorPickerDays(180); }} disabled={sponsorBusy === p.id}>
                                <BarChartIcon size={14} /> {sponsorBusy === p.id ? "..." : "Sponsoriser"}
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="pfield" style={{ gridColumn: "1 / -1", flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => {
                            const url = window.location.origin + "/shop/" + p.id;
                            const text = p.name + " — " + Number(p.price).toLocaleString("fr-FR") + " FCFA sur Kimoxa";
                            navigator.share ? navigator.share({ title: p.name, text, url }) : navigator.clipboard.writeText(url).then(() => toast.success("Lien copié !"));
                          }}>
                            📲 Partager
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteProduct(p.id, p.name)}>
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