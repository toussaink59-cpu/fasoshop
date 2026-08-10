"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminBottomNav from "@/app/components/AdminBottomNav";
import KimoxaLogo from "@/app/components/KimoxaLogo";

const STATUS_UI = {
  released: { icon: "✅", label: "À payer", cls: "vendor-earnings-released" },
  held: { icon: "🔒", label: "Séquestré", cls: "vendor-earnings-held" },
  paid: { icon: "💸", label: "Payé", cls: "vendor-earnings-paid" },
};

const PAYMENT_METHODS = [
  { value: "orange_money", label: "📱 Orange Money" },
  { value: "moov_money", label: "📱 Moov Money" },
  { value: "bank_transfer", label: "🏦 Virement bancaire" },
  { value: "cash", label: "💵 Espèces" },
];

export default function AdminPayoutsPage() {
  const router = useRouter();
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // 🔒 Modale de paiement sécurisé
  const [payingPayout, setPayingPayout] = useState(null);
  const [serverMode, setServerMode] = useState("manual"); // mode configuré côté serveur
  const [payMode, setPayMode] = useState("manual"); // mode choisi dans la modale
  const [form, setForm] = useState({
    amountPaid: "",
    paymentMethod: "orange_money",
    transactionReference: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/payouts");
    if (res.status === 401 || res.status === 403) {
      router.push("/login");
      return;
    }
    const data = await res.json();
    setPayouts(data.payouts || []);
    setServerMode(data.payoutMode || "manual");
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user || d.user.role !== "admin") {
          router.push("/login");
          return;
        }
        load();
      });
  }, [load, router]);

  function openPayModal(payout) {
    setPayingPayout(payout);
    setPayMode(serverMode === "auto" ? "auto" : "manual");
    setForm({
      amountPaid: String(payout.payout_amount),
      paymentMethod: "orange_money",
      transactionReference: "",
      notes: "",
    });
    setFormError("");
  }

  function closeModal() {
    setPayingPayout(null);
    setFormError("");
  }

  // 🔒 Validation temps réel
  function validate() {
    if (!payingPayout) return "Aucun payout sélectionné.";
    
    // Mode auto : le serveur vérifie tout
    if (payMode === "auto") return "";
    
    // Mode manuel : validation côté client
    const amount = Number(form.amountPaid);
    const expected = Number(payingPayout.payout_amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return "Montant payé invalide.";
    }
    const diff = Math.abs(amount - expected) / expected;
    if (diff > 0.01) {
      return `Le montant payé (${amount.toLocaleString("fr-FR")} FCFA) ne correspond pas au montant dû (${expected.toLocaleString("fr-FR")} FCFA). Tolérance : ±1%.`;
    }
    if (!form.transactionReference || form.transactionReference.trim().length < 5) {
      return "La référence de transaction doit contenir au moins 5 caractères.";
    }
    if (form.notes.length > 500) {
      return "Les notes ne peuvent pas dépasser 500 caractères.";
    }
    return "";
  }

  async function submitPayout(e) {
    e.preventDefault();
    const err = validate();
    if (err) {
      setFormError(err);
      return;
    }

    // Double confirmation (argent réel)
    const isAuto = payMode === "auto";
    const amount = isAuto ? Number(payingPayout.payout_amount) : Number(form.amountPaid);
    const methodLabel = isAuto
      ? "API automatique"
      : PAYMENT_METHODS.find((m) => m.value === form.paymentMethod)?.label;
    
    if (
      !window.confirm(
        `⚠️ CONFIRMATION FINALE\n\n` +
          `Verser ${amount.toLocaleString("fr-FR")} FCFA à ${payingPayout.vendor_name} (${payingPayout.shop_name}) ?\n\n` +
          `Mode : ${isAuto ? "🤖 Automatique (API)" : "✍️ Manuel"}\n` +
          `${!isAuto ? `Méthode : ${methodLabel}\nRéférence : ${form.transactionReference}\n\n` : ""}` +
          `Cette action est irréversible.`
      )
    ) {
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      const res = await fetch(`/api/admin/payouts/${payingPayout.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isAuto
            ? { mode: "auto" }
            : {
                amountPaid: Number(form.amountPaid),
                paymentMethod: form.paymentMethod,
                transactionReference: form.transactionReference.trim(),
                notes: form.notes.trim() || null,
              }
        ),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "Erreur lors du versement.");
        setSubmitting(false);
        return;
      }

      setMessage(
        `✅ ${amount.toLocaleString("fr-FR")} FCFA versés à ${payingPayout.vendor_name} via ${methodLabel}` +
          `${data.payout?.reference ? ` (réf: ${data.payout.reference})` : ""}`
      );
      closeModal();
      load();
    } catch (err) {
      setFormError("Impossible de contacter le serveur.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const toPay = payouts.filter((p) => p.payout_status === "released");
  const held = payouts.filter((p) => p.payout_status === "held");
  const paid = payouts.filter((p) => p.payout_status === "paid");

  const sum = (list) => list.reduce((t, p) => t + Number(p.payout_amount || 0), 0);

  // 🔒 Indicateur de cohérence montant (mode manuel uniquement)
  const amountNum = Number(form.amountPaid);
  const expectedAmount = payingPayout ? Number(payingPayout.payout_amount) : 0;
  const isAmountMatch =
    payMode === "manual" &&
    Number.isFinite(amountNum) &&
    Math.abs(amountNum - expectedAmount) / expectedAmount <= 0.01;

  function renderRow(p) {
    const ui = STATUS_UI[p.payout_status];
    return (
      <div className="order-card" key={p.id} style={{ marginBottom: 10 }}>
        <div className="order-head">
          <div>
            <strong>🏪 {p.shop_name}</strong>
            <span className="order-date">
              {p.vendor_name} · 📞 {p.vendor_phone || "—"} · Commande #{p.order_id}
            </span>
          </div>
          <span className={`status-pill ${ui.cls}`} style={{ border: "1px solid var(--border)" }}>
            {ui.icon} {ui.label}
          </span>
        </div>
        <div className="order-items" style={{ marginTop: 8 }}>
          <div className="order-item-row">
            <span className="order-item-name">Brut vendu</span>
            <span className="order-item-qty">{Number(p.gross_amount).toLocaleString("fr-FR")} FCFA</span>
          </div>
          <div className="order-item-row">
            <span className="order-item-name">Commission Kimoxa (5,5%)</span>
            <span className="order-item-qty">− {Number(p.commission_amount).toLocaleString("fr-FR")} FCFA</span>
          </div>
          <div className="order-item-row">
            <span className="order-item-name"><strong>Net vendeur</strong></span>
            <span className="order-item-qty"><strong>{Number(p.payout_amount).toLocaleString("fr-FR")} FCFA</strong></span>
          </div>
        </div>
        {p.payout_status === "released" && (
          <button
            className="btn btn-primary order-contact-btn"
            style={{ marginTop: 8 }}
            onClick={() => openPayModal(p)}
          >
            💸 Verser au vendeur
          </button>
        )}
        {p.payout_status === "paid" && p.payout_paid_at && (
          <p style={{ margin: "8px 0 0", fontSize: "0.75rem", color: "var(--ink-400)" }}>
            💸 Versé le {new Date(p.payout_paid_at).toLocaleString("fr-FR")}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand">
          <KimoxaLogo light size={20} /> <span className="role-tag">Admin</span>
        </div>
        <div className="topbar-actions">
          <Link href="/admin/dashboard" className="topbar-textlink">Tableau de bord</Link>
          <button className="topbar-logout" onClick={handleLogout}>Déconnexion</button>
        </div>
      </div>
      <div className="woven-strip" />

      <div className="vendor-dashboard-wrap">
        <div className="vendor-dashboard-header">
          <h1>💸 Gestion des payouts</h1>
          <p>
            À payer : <strong>{sum(toPay).toLocaleString("fr-FR")} FCFA</strong> ({toPay.length}) ·
            Séquestrés : <strong>{sum(held).toLocaleString("fr-FR")} FCFA</strong> ({held.length}) ·
            Déjà payés : <strong>{sum(paid).toLocaleString("fr-FR")} FCFA</strong> ({paid.length})
          </p>
          {serverMode === "auto" && (
            <p style={{ fontSize: "0.8rem", color: "var(--millet-600)", marginTop: 4 }}>
              🤖 Mode automatique activé — les paiements sont envoyés via l'API CinetPay
            </p>
          )}
        </div>

        {message && <div className="success-box">{message}</div>}

        {loading ? (
          <p>Chargement...</p>
        ) : (
          <>
            <h2 style={{ fontSize: "1rem", margin: "16px 0 8px" }}>✅ À payer maintenant ({toPay.length})</h2>
            {toPay.length === 0 ? <p style={{ fontSize: "0.85rem", color: "var(--ink-400)" }}>Aucun payout en attente de versement.</p> : toPay.map(renderRow)}

            <h2 style={{ fontSize: "1rem", margin: "20px 0 8px" }}>🔒 Séquestrés — en attente de livraison ({held.length})</h2>
            {held.length === 0 ? <p style={{ fontSize: "0.85rem", color: "var(--ink-400)" }}>Aucun fonds séquestré.</p> : held.map(renderRow)}

            <h2 style={{ fontSize: "1rem", margin: "20px 0 8px" }}>💸 Historique des versements ({paid.length})</h2>
            {paid.length === 0 ? <p style={{ fontSize: "0.85rem", color: "var(--ink-400)" }}>Aucun versement effectué.</p> : paid.map(renderRow)}
          </>
        )}
      </div>
      <AdminBottomNav />

      {/* 🔒 MODALE DE PAIEMENT SÉCURISÉ */}
      {payingPayout && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
          onClick={closeModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white",
              borderRadius: 12,
              padding: 24,
              maxWidth: 480,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ margin: "0 0 8px", fontSize: "1.2rem" }}>💰 Paiement au vendeur</h2>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--ink-500)" }}>
                <strong>{payingPayout.shop_name}</strong> · {payingPayout.vendor_name}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--ink-400)" }}>
                Commande #{payingPayout.order_id}
              </p>
            </div>

            {/* Récapitulatif */}
            <div
              style={{
                background: "#faf7f2",
                border: "1px dashed var(--border)",
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: "0.85rem" }}>
                <span>Brut vendu</span>
                <span>{Number(payingPayout.gross_amount).toLocaleString("fr-FR")} FCFA</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: "0.85rem" }}>
                <span>Commission Kimoxa (5,5%)</span>
                <span>− {Number(payingPayout.commission_amount).toLocaleString("fr-FR")} FCFA</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  paddingTop: 8,
                  borderTop: "1px solid var(--border)",
                  fontWeight: 700,
                }}
              >
                <span>Montant dû</span>
                <span>{Number(payingPayout.payout_amount).toLocaleString("fr-FR")} FCFA</span>
              </div>
            </div>

            <form onSubmit={submitPayout}>
              {formError && <div className="error-box" style={{ marginBottom: 12 }}>{formError}</div>}

              {/* 🆕 SÉLECTEUR DE MODE (visible seulement si auto activé côté serveur) */}
              {serverMode === "auto" && (
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: "0.85rem", marginBottom: 8, fontWeight: 600 }}>
                    Mode de paiement *
                  </label>
                  <div className="payment-options">
                    <label className={`payment-option ${payMode === "auto" ? "selected" : ""}`}>
                      <input
                        type="radio"
                        name="payMode"
                        value="auto"
                        checked={payMode === "auto"}
                        onChange={() => setPayMode("auto")}
                      />
                      <div>
                        <div className="payment-option-title">🤖 Automatique (API payout)</div>
                        <div className="payment-option-desc">
                          Argent envoyé instantanément au Mobile Money du vendeur, référence fournie par l'API.
                        </div>
                      </div>
                    </label>
                    <label className={`payment-option ${payMode === "manual" ? "selected" : ""}`}>
                      <input
                        type="radio"
                        name="payMode"
                        value="manual"
                        checked={payMode === "manual"}
                        onChange={() => setPayMode("manual")}
                      />
                      <div>
                        <div className="payment-option-title">✍️ Manuel</div>
                        <div className="payment-option-desc">
                          Vous envoyez l'argent puis saisissez la référence (secours, espèces, virement).
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* 🆕 RÉCAPITULATIF DESTINATION (mode auto uniquement) */}
              {payMode === "auto" && (
                <div
                  style={{
                    background: "#ecfdf5",
                    border: "1px dashed #10b981",
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 16,
                    fontSize: "0.85rem",
                  }}
                >
                  📱 <strong>Destination :</strong> {payingPayout.mobile_money_number || payingPayout.vendor_phone}
                  {" · "}
                  {payingPayout.mobile_money_provider === "moov" ? "Moov Money" : "Orange Money"}
                  <br />
                  <small style={{ color: "var(--ink-400)", display: "block", marginTop: 4 }}>
                    La référence de transaction sera générée automatiquement par l'API.
                  </small>
                </div>
              )}

              {/* CHAMPS MANUELS (visibles seulement en mode manuel) */}
              {payMode === "manual" && (
                <>
                  {/* Montant payé */}
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label style={{ display: "block", fontSize: "0.85rem", marginBottom: 4, fontWeight: 600 }}>
                      Montant payé *
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={form.amountPaid}
                      onChange={(e) => setForm({ ...form, amountPaid: e.target.value })}
                      required
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: `2px solid ${form.amountPaid && !isAmountMatch ? "#dc2626" : isAmountMatch ? "#16a34a" : "var(--border)"}`,
                        borderRadius: 8,
                        fontSize: "1rem",
                        fontWeight: 600,
                      }}
                      placeholder={String(payingPayout.payout_amount)}
                    />
                    {form.amountPaid && isAmountMatch && (
                      <small style={{ color: "#16a34a", fontSize: "0.75rem" }}>✓ Montant cohérent</small>
                    )}
                    {form.amountPaid && !isAmountMatch && (
                      <small style={{ color: "#dc2626", fontSize: "0.75rem" }}>
                        ✗ Doit correspondre à {expectedAmount.toLocaleString("fr-FR")} FCFA (±1%)
                      </small>
                    )}
                  </div>

                  {/* Méthode de paiement */}
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label style={{ display: "block", fontSize: "0.85rem", marginBottom: 4, fontWeight: 600 }}>
                      Méthode de paiement *
                    </label>
                    <select
                      value={form.paymentMethod}
                      onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                      required
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: "0.95rem",
                      }}
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Référence de transaction */}
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label style={{ display: "block", fontSize: "0.85rem", marginBottom: 4, fontWeight: 600 }}>
                      Référence de transaction *
                    </label>
                    <input
                      type="text"
                      value={form.transactionReference}
                      onChange={(e) => setForm({ ...form, transactionReference: e.target.value })}
                      required
                      minLength={5}
                      maxLength={100}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: "0.95rem",
                        fontFamily: "monospace",
                      }}
                      placeholder="Ex: OM-2026-08-12-78451"
                    />
                    <small style={{ color: "var(--ink-400)", fontSize: "0.75rem" }}>
                      Numéro de transaction Mobile Money ou virement (min 5 caractères)
                    </small>
                  </div>

                  {/* Notes */}
                  <div className="form-group" style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: "0.85rem", marginBottom: 4, fontWeight: 600 }}>
                      Notes <span style={{ fontWeight: 400, color: "var(--ink-400)" }}>(optionnel)</span>
                    </label>
                    <textarea
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      maxLength={500}
                      rows={3}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: "0.95rem",
                        resize: "vertical",
                        fontFamily: "inherit",
                      }}
                      placeholder="Informations complémentaires..."
                    />
                    <small style={{ color: "var(--ink-400)", fontSize: "0.75rem" }}>
                      {form.notes.length}/500 caractères
                    </small>
                  </div>
                </>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={closeModal}
                  disabled={submitting}
                  style={{ flex: 1 }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={
                    submitting ||
                    (payMode === "manual" &&
                      (!form.amountPaid || !isAmountMatch || form.transactionReference.trim().length < 5))
                  }
                  style={{ flex: 2 }}
                >
                  {submitting ? "Versement..." : `✅ Confirmer le versement`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
