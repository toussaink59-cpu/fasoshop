"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminBottomNav from "@/app/components/AdminBottomNav";
import KimoxaLogo from "@/app/components/KimoxaLogo";

const TYPE_LABELS = { percentage: "Pourcentage (%)", fixed: "Montant fixe (FCFA)" };

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function getStatus(c) {
  if (!c.active) return { label: "Désactivé", cls: "status-cancelled" };
  if (c.valid_until && new Date(c.valid_until) < new Date()) return { label: "Expiré", cls: "status-cancelled" };
  if (c.usage_limit && c.usage_count >= c.usage_limit) return { label: "Épuisé", cls: "status-pending" };
  return { label: "Actif", cls: "status-delivered" };
}

export default function AdminPromoCodes() {
  const router = useRouter();
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: "", type: "percentage", value: "", min_order_amount: "", max_discount: "", usage_limit: "", valid_until: "",
  });

    async function load() {
    try {
      const res = await fetch("/api/admin/promo-codes");
      if (res.status === 401 || res.status === 403) { router.push("/login"); return; }
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        setError(`Erreur serveur ${res.status}: ${txt.slice(0, 200)}`);
        setLoading(false);
        return;
      }
      const d = await res.json();
      setCodes(d.codes || []);
      setLoading(false);
    } catch (e) {
      setError(`Erreur réseau: ${e.message}`);
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError(""); setSuccess("");
    const res = await fetch("/api/admin/promo-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: Number(form.value),
        min_order_amount: form.min_order_amount ? Number(form.min_order_amount) : null,
        max_discount: form.max_discount ? Number(form.max_discount) : null,
        usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
        valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
      }),
    });
    const d = await res.json();
    if (!res.ok) { setError(d.error || "Erreur."); return; }
    setSuccess(`✅ Code "${d.code.code}" créé avec succès.`);
    setForm({ code: "", type: "percentage", value: "", min_order_amount: "", max_discount: "", usage_limit: "", valid_until: "" });
    setShowForm(false);
    load();
  }

    async function toggleActive(c) {
    setBusy(c.id);
    setError("");
    const res = await fetch(`/api/admin/promo-codes/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !c.active }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      load();
    } else {
      setError(`❌ ${d.error || "Erreur inconnue"}`);
    }
    setBusy(null);
  }

  async function handleDelete(c) {
    if (!window.confirm(`Supprimer définitivement le code "${c.code}" ?`)) return;
    setBusy(c.id);
    await fetch(`/api/admin/promo-codes/${c.id}`, { method: "DELETE" });
    load();
    setBusy(null);
  }

  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand"><KimoxaLogo light size={20} /> <span className="role-tag">Admin</span></div>
        <div className="topbar-actions">
          <Link href="/admin/dashboard" className="topbar-textlink">← Dashboard</Link>
          <Link href="/admin/analytics" className="topbar-textlink">Analytics</Link>
        </div>
      </div>
      <div className="woven-strip" />

      <div className="vendor-dashboard-wrap">
        <div className="vendor-dashboard-header">
          <h1>🎁 Codes promo</h1>
          <p>Créez et gérez les codes de réduction pour vos clients</p>
        </div>

        {error && <div className="error-box">{error}</div>}
        {success && <div className="success-box">{success}</div>}

        <div className="vendor-actions-bar">
          <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
            {showForm ? "✕ Annuler" : "+ Nouveau code promo"}
          </button>
        </div>

        {showForm && (
          <div className="vendor-form-card">
            <h2>Nouveau code promo</h2>
            <form onSubmit={handleCreate}>
              <div className="form-row">
                <div>
                  <label>Code *</label>
                  <input required value={form.code} onChange={e => setForm({...form, code: e.target.value})} placeholder="Ex: BIENVENUE10" style={{ textTransform: "uppercase" }} />
                </div>
                <div>
                  <label>Type *</label>
                  <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                    <option value="percentage">Pourcentage (%)</option>
                    <option value="fixed">Montant fixe (FCFA)</option>
                  </select>
                </div>
                <div>
                  <label>Valeur *</label>
                  <input required type="number" min="0" step="0.01" value={form.value} onChange={e => setForm({...form, value: e.target.value})} placeholder={form.type === "percentage" ? "10" : "2000"} />
                </div>
              </div>
              <div className="form-row">
                <div>
                  <label>Commande minimum (FCFA)</label>
                  <input type="number" min="0" value={form.min_order_amount} onChange={e => setForm({...form, min_order_amount: e.target.value})} placeholder="0 = sans minimum" />
                </div>
                <div>
                  <label>Remise max (FCFA, % seulement)</label>
                  <input type="number" min="0" value={form.max_discount} disabled={form.type !== "percentage"} onChange={e => setForm({...form, max_discount: e.target.value})} placeholder="Illimité" />
                </div>
                <div>
                  <label>Limite d'utilisations</label>
                  <input type="number" min="1" value={form.usage_limit} onChange={e => setForm({...form, usage_limit: e.target.value})} placeholder="Illimité" />
                </div>
              </div>
              <div className="form-row">
                <div>
                  <label>Valide jusqu'au</label>
                  <input type="datetime-local" value={form.valid_until} onChange={e => setForm({...form, valid_until: e.target.value})} />
                </div>
              </div>
              <button type="submit" className="btn btn-primary">Créer le code</button>
            </form>
          </div>
        )}

        <div className="vendor-products-section">
          <h2>Codes existants ({codes.length})</h2>
          {loading ? <p>Chargement...</p> : codes.length === 0 ? (
            <div className="empty-state">
              <div className="glyph">🎁</div>
              <p>Aucun code promo pour l'instant. Créez-en un ci-dessus.</p>
            </div>
          ) : (
            <div className="vendor-products-grid">
              {codes.map(c => {
                const st = getStatus(c);
                return (
                  <div key={c.id} className="vendor-product-card" style={{ padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <strong style={{ fontSize: "1.1rem", fontFamily: "monospace", letterSpacing: 1 }}>{c.code}</strong>
                      <span className={`status-pill ${st.cls}`}>{st.label}</span>
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--ink-400)", marginBottom: 8 }}>
                      {c.type === "percentage" ? `-${c.value}%` : `-${Number(c.value).toLocaleString("fr-FR")} FCFA`}
                      {c.min_order_amount > 0 && <span> · Min. {Number(c.min_order_amount).toLocaleString("fr-FR")} FCFA</span>}
                      {c.type === "percentage" && c.max_discount && <span> · Max {Number(c.max_discount).toLocaleString("fr-FR")} FCFA</span>}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--ink-400)", marginBottom: 10 }}>
                      Utilisé {c.usage_count}{c.usage_limit ? `/${c.usage_limit}` : ""} fois
                      {c.valid_until && <span> · Expire {formatDate(c.valid_until)}</span>}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-ghost" style={{ flex: 1, fontSize: "0.8rem" }} onClick={() => toggleActive(c)} disabled={busy === c.id}>
                        {c.active ? "⏸ Désactiver" : "▶ Activer"}
                      </button>
                      <button className="btn btn-ghost" style={{ color: "#dc2626", fontSize: "0.8rem" }} onClick={() => handleDelete(c)} disabled={busy === c.id}>
                        🗑
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <AdminBottomNav pendingShopsCount={0} pendingModerationCount={0} />
    </div>
  );
}