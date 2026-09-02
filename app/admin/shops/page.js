"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/lib/toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminBottomNav from "@/app/components/AdminBottomNav";
import KimoxaLogo from "@/app/components/KimoxaLogo";
import {
  StoreIcon, CheckCircleIcon, XCircleIcon, ClockIcon, UserIcon,
  MapPinIcon, PackageIcon, ShieldCheckIcon, CreditCardIcon, AlertTriangleIcon,
  SearchIcon, UploadIcon, LockIcon, RotateCcwIcon,
} from "@/app/components/Icons";

const DOC_LABELS = { cni: "CNI", passeport: "Passeport", permis: "Permis" };
const STATUS_LABELS = { active: "Active", pending: "En attente", suspended: "Suspendue", rejected: "Rejetée" };

function DocumentModal({ shop, onClose, onApprove, onReject, isBusy }) {
  if (!shop) return null;
  return (
    <div className="doc-modal-overlay" onClick={onClose}>
      <div className="doc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="doc-modal-head">
          <div>
            <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ShieldCheckIcon size={20} /> Vérification d'identité
            </h2>
            <p className="doc-modal-shop">{shop.name} · {shop.vendor_name}</p>
          </div>
          <button className="doc-modal-close" onClick={onClose} aria-label="Fermer">×</button>
        </div>

        <div className="doc-modal-body">
          {shop.id_document_url ? (
            <img src={shop.id_document_url} alt={`Pièce d'identité de ${shop.vendor_name}`} className="doc-modal-image" />
          ) : (
            <div className="doc-modal-no-image">
              <span style={{ display: "flex", justifyContent: "center", color: "var(--ink-400)" }}><UploadIcon size={48} /></span>
              <p>Aucune photo fournie par le vendeur.</p>
            </div>
          )}

          <div className="doc-modal-info">
            <div className="doc-modal-info-row"><span className="doc-modal-label">Boutique</span><strong>{shop.name}</strong></div>
            <div className="doc-modal-info-row"><span className="doc-modal-label">Vendeur</span><strong>{shop.vendor_name}</strong></div>
            <div className="doc-modal-info-row"><span className="doc-modal-label">Email</span><span>{shop.vendor_email}</span></div>
            <div className="doc-modal-info-row"><span className="doc-modal-label">Téléphone</span><span>{shop.vendor_phone || "—"}</span></div>
            <div className="doc-modal-info-row"><span className="doc-modal-label">Ville</span><span>{shop.city || "—"}</span></div>
            <div className="doc-modal-info-row"><span className="doc-modal-label">Type de pièce</span><strong>{DOC_LABELS[shop.id_document_type] || shop.id_document_type || "—"}</strong></div>
            <div className="doc-modal-info-row"><span className="doc-modal-label">Numéro</span><strong style={{ fontFamily: "var(--font-mono)" }}>{shop.id_document_number || "—"}</strong></div>
          </div>
        </div>

        <div className="doc-modal-foot">
          <button className="btn btn-ghost" onClick={onClose} disabled={isBusy}>Annuler</button>
          <button className="btn btn-danger" onClick={() => onReject(shop.id)} disabled={isBusy || shop.status === "rejected"} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <XCircleIcon size={16} /> Rejeter
          </button>
          <button className="btn btn-primary" onClick={() => onApprove(shop.id)} disabled={isBusy || shop.status === "active" || !shop.id_document_url} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <CheckCircleIcon size={16} /> Valider la boutique
          </button>
        </div>
      </div>
    </div>
  );
}

function RejectModal({ shop, onClose, onConfirm, rejectReason, setRejectReason, isBusy }) {
  if (!shop) return null;
  return (
    <div className="doc-modal-overlay" onClick={onClose}>
      <div className="doc-modal doc-modal-small" onClick={(e) => e.stopPropagation()}>
        <div className="doc-modal-head">
          <div>
            <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}><XCircleIcon size={20} /> Motif du rejet</h2>
            <p className="doc-modal-shop">{shop.name}</p>
          </div>
          <button className="doc-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="doc-modal-body">
          <label style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: 6, display: "block" }}>Motif (envoyé au vendeur) *</label>
          <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Ex : Photo floue, pièce expirée, nom différent..." rows={4}
            style={{ width: "100%", padding: "10px", border: "1px solid var(--border)", borderRadius: 8, fontFamily: "inherit", fontSize: "0.9rem" }} />
        </div>
        <div className="doc-modal-foot">
          <button className="btn btn-ghost" onClick={onClose} disabled={isBusy}>Annuler</button>
          <button className="btn btn-danger" onClick={() => onConfirm(shop.id)} disabled={isBusy || !rejectReason.trim()}>Confirmer le rejet</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminShopsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const toast = useToast();
  const [updatingShopId, setUpdatingShopId] = useState(null);

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [statusCounts, setStatusCounts] = useState({});
  const [inspectingShop, setInspectingShop] = useState(null);
  const [rejectingShop, setRejectingShop] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const loadShops = useCallback(async (p) => {
    const res = await fetch("/api/admin/shops?page=" + p + "&limit=25");
    if (res.status === 401 || res.status === 403) { router.push("/login"); return; }
    const data = await res.json();
    setShops(data.shops || []);
    setPagination(data.pagination || null);
    setStatusCounts(data.statusCounts || {});
    setLoading(false);
  }, [router]);

  // P2-13 : chargement pagine
  useEffect(() => { loadShops(page); }, [page, loadShops]);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((data) => {
      if (!data.user || data.user.role !== "admin") { router.push("/login"); return; }
      setUser(data.user);
    });
  }, [loadShops, router]);

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") { setInspectingShop(null); setRejectingShop(null); } }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function handleApprove(shopId) {
    setError(""); setUpdatingShopId(shopId);
    const res = await fetch(`/api/admin/shops/${shopId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "active" }) });
    const data = await res.json();
    setUpdatingShopId(null);
    if (!res.ok) { setError(data.error || "Erreur lors de la validation."); return; }
    setInspectingShop(null); loadShops(page);
    toast.success("Boutique mise à jour");
  }

  async function handleReject(shopId, reason) {
    if (!reason?.trim()) { setRejectingShop(shops.find((s) => s.id === shopId) || null); return; }
    setError(""); setUpdatingShopId(shopId);
    const res = await fetch(`/api/admin/shops/${shopId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "rejected", rejectionReason: reason }) });
    const data = await res.json();
    setUpdatingShopId(null);
    if (!res.ok) { setError(data.error || "Erreur lors du rejet."); return; }
    setInspectingShop(null); setRejectingShop(null); setRejectReason(""); loadShops(page);
  }

  async function handleSuspend(shopId) {
    if (!window.confirm("Suspendre cette boutique ? Le vendeur ne pourra plus vendre.")) return;
    setError(""); setUpdatingShopId(shopId);
    const res = await fetch(`/api/admin/shops/${shopId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "suspended" }) });
    const data = await res.json();
    setUpdatingShopId(null);
    if (!res.ok) { setError(data.error || "Erreur."); return; }
    setInspectingShop(null); loadShops(page);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  // P2-13 : compteurs globaux fournis par l'API (pas seulement la page courante)
  const pendingShopsCount = Number(statusCounts.pending || 0);
  const activeShopsCount = Number(statusCounts.active || 0);
  const totalShopsCount = Number(pagination ? pagination.total : shops.length);

  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand"><KimoxaLogo light size={20} /> <span className="role-tag">Admin</span></div>
        <div className="topbar-actions">
          <Link href="/admin/dashboard" className="topbar-textlink">Tableau de bord</Link>
          <button className="topbar-logout" onClick={handleLogout}>Déconnexion</button>
        </div>
      </div>
      <div className="woven-strip" />

      <div className="vendor-dashboard-wrap">
        <div className="vendor-dashboard-header">
          <h1>Boutiques</h1>
          <p>{user ? `Connecté en tant que ${user.full_name}` : ""}</p>
        </div>

        {error && <div className="error-box">{error}</div>}

        <div className="vendor-stats-grid">
          <div className="vendor-stat-card">
            <div className="vendor-stat-icon" style={{ color: "var(--gold-600)" }}><StoreIcon size={28} /></div>
            <div className="vendor-stat-value">{totalShopsCount}</div>
            <div className="vendor-stat-label">Boutiques totales</div>
          </div>
          <div className="vendor-stat-card">
            <div className="vendor-stat-icon" style={{ color: "var(--millet-600)" }}><CheckCircleIcon size={28} /></div>
            <div className="vendor-stat-value" style={{ color: "var(--millet-600)" }}>{activeShopsCount}</div>
            <div className="vendor-stat-label">Actives</div>
          </div>
          <div className="vendor-stat-card">
            <div className="vendor-stat-icon" style={{ color: pendingShopsCount > 0 ? "var(--gold-600)" : "var(--gold-600)" }}><ClockIcon size={28} /></div>
            <div className="vendor-stat-value" style={{ color: pendingShopsCount > 0 ? "var(--gold-600)" : "inherit" }}>{pendingShopsCount}</div>
            <div className="vendor-stat-label">À vérifier</div>
          </div>
        </div>

        <div className="ana-panel">
          <h2>Vérification des boutiques</h2>
          <p style={{ fontSize: "0.85rem", color: "var(--ink-400)", marginTop: -8, marginBottom: 16 }}>
            Cliquez sur la miniature pour zoomer sur la pièce d'identité, puis validez ou rejetez.
          </p>

          {loading ? <p>Chargement...</p> : shops.length === 0 ? (
            <div className="empty-state">
              <div className="glyph" style={{ display: "inline-flex", color: "var(--gold-600)" }}><StoreIcon size={48} /></div>
              <p>Aucune boutique pour l'instant.</p>
            </div>
          ) : (
            <div className="admin-shops-list">
              {shops.map((s) => (
                <div className="admin-shop-card" key={s.id}>
                  <div className="admin-shop-main">
                    <button className="admin-shop-doc-thumb" onClick={() => setInspectingShop(s)}
                      title="Voir la pièce en grand" disabled={!s.id_document_url}>
                      {s.id_document_url ? (
                        <img src={s.id_document_url} alt={`Pièce ${s.id_document_type}`} />
                      ) : (
                        <div className="admin-shop-doc-empty">
                          <span style={{ display: "flex", justifyContent: "center", color: "var(--ink-400)" }}><UploadIcon size={32} /></span>
                          <small>Aucune photo</small>
                        </div>
                      )}
                    </button>

                    <div className="admin-shop-info">
                      <div className="admin-shop-top">
                        <strong className="admin-shop-name">{s.name}</strong>
                        <span className={`badge ${s.status === "active" ? "badge-ok" : s.status === "pending" ? "" : "badge-low"}`}
                          style={s.status === "pending" ? { background: "#fef3c7", color: "#92400e" } : {}}>
                          {STATUS_LABELS[s.status] || s.status}
                        </span>
                      </div>
                      <div className="admin-shop-vendor" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <UserIcon size={14} /> {s.vendor_name} · {s.vendor_email}
                      </div>
                      {s.city && <div className="admin-shop-meta" style={{ display: "flex", alignItems: "center", gap: 6 }}><MapPinIcon size={14} /> {s.city}</div>}
                      <div className="admin-shop-doc-line">
                        {s.id_document_type ? (
                          <><strong>{DOC_LABELS[s.id_document_type] || s.id_document_type}</strong>{" n° "}<code>{s.id_document_number}</code></>
                        ) : (<span style={{ color: "var(--ink-400)", fontSize: "0.78rem" }}>Aucune pièce fournie</span>)}
                      </div>
                      {s.status === "rejected" && s.rejection_reason && (
                        <div className="admin-shop-reject-reason" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <XCircleIcon size={14} /> Motif : {s.rejection_reason}
                        </div>
                      )}
                      <div className="admin-shop-stats" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><PackageIcon size={14} /> {s.product_count} produit{s.product_count > 1 ? "s" : ""}</span>
                        <span>· {s.total_stock} en stock</span>
                      </div>
                    </div>
                  </div>

                  <div className="admin-shop-actions">
                    <button className="btn btn-ghost" onClick={() => setInspectingShop(s)} disabled={!s.id_document_url} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <SearchIcon size={14} /> {s.id_document_url ? "Voir la pièce" : "Pas de pièce"}
                    </button>
                    {s.status === "pending" && (
                      <>
                        <button className="btn btn-primary" disabled={updatingShopId === s.id || !s.id_document_url} onClick={() => handleApprove(s.id)} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          {updatingShopId === s.id ? "..." : <><CheckCircleIcon size={14} /> Valider</>}
                        </button>
                        <button className="btn btn-danger" disabled={updatingShopId === s.id} onClick={() => { setRejectingShop(s); setRejectReason(""); }} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <XCircleIcon size={14} /> Rejeter
                        </button>
                      </>
                    )}
                    {s.status === "active" && (
                      <button className="btn btn-ghost" disabled={updatingShopId === s.id} onClick={() => handleSuspend(s.id)} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <AlertTriangleIcon size={14} /> Suspendre
                      </button>
                    )}
                    {s.status === "suspended" && (
                      <button className="btn btn-primary" disabled={updatingShopId === s.id} onClick={() => handleApprove(s.id)} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <RotateCcwIcon size={14} /> Réactiver
                      </button>
                    )}
                    {s.status === "rejected" && (
                      <button className="btn btn-primary" disabled={updatingShopId === s.id || !s.id_document_url} onClick={() => handleApprove(s.id)} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <RotateCcwIcon size={14} /> Réactiver
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {!loading && pagination && (pagination.totalPages || 0) > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 16 }}>
          <button className="btn btn-ghost" disabled={!pagination.hasPrev} onClick={() => setPage(Math.max(1, page - 1))}>← Précédent</button>
          <span style={{ fontSize: "0.85rem", color: "var(--ink-400)" }}>
            Page {pagination.page} sur {pagination.totalPages} · {pagination.total} boutiques
          </span>
          <button className="btn btn-ghost" disabled={!pagination.hasNext} onClick={() => setPage(page + 1)}>Suivant →</button>
        </div>
      )}

      <DocumentModal
        shop={inspectingShop} onClose={() => setInspectingShop(null)}
        onApprove={handleApprove}
        onReject={(id) => { setInspectingShop(null); setRejectingShop(shops.find((s) => s.id === id) || null); setRejectReason(""); }}
        isBusy={updatingShopId !== null}
      />

      <RejectModal
        shop={rejectingShop} onClose={() => { setRejectingShop(null); setRejectReason(""); }}
        onConfirm={(id) => handleReject(id, rejectReason)}
        rejectReason={rejectReason} setRejectReason={setRejectReason}
        isBusy={updatingShopId !== null}
      />

      <AdminBottomNav pendingShopsCount={pendingShopsCount} />
    </div>
  );
}
