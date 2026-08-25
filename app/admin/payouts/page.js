"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminBottomNav from "@/app/components/AdminBottomNav";
import KimoxaLogo from "@/app/components/KimoxaLogo";
import {
  CheckCircleIcon, LockIcon, CreditCardIcon, SmartphoneIcon, StoreIcon,
  TruckIcon, ClockIcon, AlertTriangleIcon, UserIcon, WalletIcon,
} from "@/app/components/Icons";

const ZapIcon = ({ size = 20, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const PencilIcon = ({ size = 18, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  </svg>
);

const STATUS_UI = {
  released: { Icon: CheckCircleIcon, label: "À payer", cls: "vendor-earnings-released" },
  held: { Icon: LockIcon, label: "Séquestré", cls: "vendor-earnings-held" },
  paid: { Icon: CreditCardIcon, label: "Payé", cls: "vendor-earnings-paid" },
};

const PAYMENT_METHODS = [
  { value: "orange_money", label: "Orange Money" },
  { value: "moov_money", label: "Moov Money" },
  { value: "bank_transfer", label: "Virement bancaire" },
  { value: "cash", label: "Espèces" },
];

export default function AdminPayoutsPage() {
  const router = useRouter();
  const [payouts, setPayouts] = useState([]);
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [payingPayout, setPayingPayout] = useState(null);
  const [serverMode, setServerMode] = useState("manual");
  const [payMode, setPayMode] = useState("manual");
  const [form, setForm] = useState({
    amountPaid: "", paymentMethod: "orange_money",
    transactionReference: "", notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [payingCourier, setPayingCourier] = useState(null);
  const [courierRef, setCourierRef] = useState("");
  const [courierError, setCourierError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/payouts");
    if (res.status === 401 || res.status === 403) { router.push("/login"); return; }
    const data = await res.json();
    setPayouts(data.payouts || []);
    setCouriers(data.couriers || []);
    setServerMode(data.payoutMode || "manual");
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => {
      if (!d.user || d.user.role !== "admin") { router.push("/login"); return; }
      load();
    });
  }, [load, router]);

  function openPayModal(payout) {
    setPayingPayout(payout);
    setPayMode(serverMode === "auto" ? "auto" : "manual");
    setForm({
      amountPaid: String(Math.round(Number(payout.payout_amount))),
      paymentMethod: "orange_money", transactionReference: "", notes: "",
    });
    setFormError("");
  }

  function closeModal() { setPayingPayout(null); setFormError(""); }

  function validate() {
    if (!payingPayout) return "Aucun payout sélectionné.";
    if (payMode === "auto") return "";
    const amount = Number(form.amountPaid);
    const expected = Number(payingPayout.payout_amount);
    if (!Number.isFinite(amount) || amount <= 0) return "Montant payé invalide.";
    const diff = Math.abs(amount - expected) / expected;
    if (diff > 0.01) {
      return `Le montant payé (${amount.toLocaleString("fr-FR")} FCFA) ne correspond pas au montant dû (${expected.toLocaleString("fr-FR")} FCFA). Tolérance : ±1%.`;
    }
    if (!form.transactionReference || form.transactionReference.trim().length < 5) {
      return "La référence de transaction doit contenir au moins 5 caractères.";
    }
    if (form.notes.length > 500) return "Les notes ne peuvent pas dépasser 500 caractères.";
    return "";
  }

  async function submitPayout(e) {
    e.preventDefault();
    const err = validate();
    if (err) { setFormError(err); return; }

    const isAuto = payMode === "auto";
    const amount = isAuto ? Number(payingPayout.payout_amount) : Number(form.amountPaid);
    const methodLabel = isAuto ? "API automatique" : PAYMENT_METHODS.find((m) => m.value === form.paymentMethod)?.label;

    if (!window.confirm(
      `[!] CONFIRMATION FINALE\n\n` +
      `Verser ${amount.toLocaleString("fr-FR")} FCFA à ${payingPayout.vendor_name} (${payingPayout.shop_name}) ?\n\n` +
      `Mode : ${isAuto ? "Automatique (API)" : "Manuel"}\n` +
      `${!isAuto ? `Méthode : ${methodLabel}\nRéférence : ${form.transactionReference}\n\n` : ""}` +
      `Cette action est irréversible.`
    )) return;

    setSubmitting(true); setFormError("");
    try {
      const res = await fetch(`/api/admin/payouts/${payingPayout.id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isAuto ? { mode: "auto" } : {
          amountPaid: Number(form.amountPaid), paymentMethod: form.paymentMethod,
          transactionReference: form.transactionReference.trim(), notes: form.notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error || "Erreur lors du versement."); setSubmitting(false); return; }
      setMessage(`[OK] ${amount.toLocaleString("fr-FR")} FCFA versés à ${payingPayout.vendor_name} via ${methodLabel}${data.payout?.reference ? ` (réf: ${data.payout.reference})` : ""}`);
      closeModal(); load();
    } catch (err) { setFormError("Impossible de contacter le serveur."); }
    finally { setSubmitting(false); }
  }

  async function submitCourier(e) {
    e.preventDefault();
    if (courierRef.trim().length < 5) { setCourierError("Référence requise (min 5 caractères)."); return; }
    setSubmitting(true); setCourierError("");
    try {
      const res = await fetch(`/api/admin/courier-payouts/${payingCourier.id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionReference: courierRef.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setCourierError(data.error || "Erreur lors du paiement."); setSubmitting(false); return; }
      setMessage(`[OK] ${Number(payingCourier.amount).toLocaleString("fr-FR")} FCFA versés au livreur (commande #${payingCourier.order_id}, réf: ${courierRef.trim()})`);
      setPayingCourier(null); setCourierRef(""); load();
    } catch { setCourierError("Impossible de contacter le serveur."); }
    finally { setSubmitting(false); }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const toPay = payouts.filter((p) => p.payout_status === "released");
  const held = payouts.filter((p) => p.payout_status === "held");
  const paid = payouts.filter((p) => p.payout_status === "paid");
  const couriersDue = couriers.filter((c) => c.status === "due");
  const couriersPaid = couriers.filter((c) => c.status === "paid");
  const sum = (list) => list.reduce((t, p) => t + Number(p.payout_amount || 0), 0);
  const sumCourier = (list) => list.reduce((t, c) => t + Number(c.amount || 0), 0);
  const amountNum = Number(form.amountPaid);
  const expectedAmount = payingPayout ? Number(payingPayout.payout_amount) : 0;
  const isAmountMatch = payMode === "manual" && Number.isFinite(amountNum) && Math.abs(amountNum - expectedAmount) / expectedAmount <= 0.01;

  function renderVendorRow(p) {
    const ui = STATUS_UI[p.payout_status];
    const { Icon } = ui;
    const deliveryFee = Number(p.delivery_fee_amount || 0);
    return (
      <div className="order-card" key={p.id} style={{ marginBottom: 10 }}>
        <div className="order-head">
          <div>
            <strong style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <StoreIcon size={16} /> {p.shop_name}
            </strong>
            <span className="order-date" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><UserIcon size={12} /> {p.vendor_name}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><SmartphoneIcon size={12} /> {p.vendor_phone || "—"}</span>
              <span>Commande #{p.order_id}</span>
            </span>
          </div>
          <span className={`status-pill ${ui.cls}`} style={{ border: "1px solid var(--border)", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Icon size={14} /> {ui.label}
          </span>
        </div>
        <div className="order-items" style={{ marginTop: 8 }}>
          <div className="order-item-row"><span className="order-item-name">Brut vendu</span><span className="order-item-qty">{Number(p.gross_amount).toLocaleString("fr-FR")} FCFA</span></div>
          <div className="order-item-row"><span className="order-item-name">Commission Kimoxa</span><span className="order-item-qty">− {Number(p.commission_amount).toLocaleString("fr-FR")} FCFA</span></div>
          {deliveryFee > 0 && (
            <div className="order-item-row">
              <span className="order-item-name" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><TruckIcon size={14} /> Livraison incluse (boutique livre)</span>
              <span className="order-item-qty">+ {deliveryFee.toLocaleString("fr-FR")} FCFA</span>
            </div>
          )}
          <div className="order-item-row"><span className="order-item-name"><strong>Net vendeur</strong></span><span className="order-item-qty"><strong>{Number(p.payout_amount).toLocaleString("fr-FR")} FCFA</strong></span></div>
        </div>
        {p.payout_status === "released" && (
          <button className="btn btn-primary order-contact-btn" style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 8 }} onClick={() => openPayModal(p)}>
            <CreditCardIcon size={16} /> Verser au vendeur
          </button>
        )}
        {p.payout_status === "paid" && p.payout_paid_at && (
          <p style={{ margin: "8px 0 0", fontSize: "0.75rem", color: "var(--ink-400)", display: "flex", alignItems: "center", gap: 6 }}>
            <CreditCardIcon size={12} /> Versé le {new Date(p.payout_paid_at).toLocaleString("fr-FR")}
          </p>
        )}
      </div>
    );
  }

  function renderCourierRow(c) {
    const isPaid = c.status === "paid";
    return (
      <div className="order-card" key={c.id} style={{ marginBottom: 10 }}>
        <div className="order-head">
          <div>
            <strong style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><TruckIcon size={16} /> Commande #{c.order_id}</strong>
            <span className="order-date">{c.shipping_address}</span>
          </div>
          <span className="status-pill" style={{ border: "1px solid var(--border)", background: isPaid ? "var(--vendor-earnings-paid-bg, #ecfdf5)" : "#fef3c7", display: "inline-flex", alignItems: "center", gap: 6 }}>
            {isPaid ? <><CreditCardIcon size={14} /> Payé</> : <><ClockIcon size={14} /> À payer · {Number(c.amount).toLocaleString("fr-FR")} FCFA</>}
          </span>
        </div>
        {!isPaid && (
          <button className="btn btn-primary order-contact-btn" style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 8 }} onClick={() => { setPayingCourier(c); setCourierRef(""); setCourierError(""); }}>
            <CreditCardIcon size={16} /> Payer le livreur
          </button>
        )}
        {isPaid && c.paid_at && (
          <p style={{ margin: "8px 0 0", fontSize: "0.75rem", color: "var(--ink-400)", display: "flex", alignItems: "center", gap: 6 }}>
            <CreditCardIcon size={12} /> Payé le {new Date(c.paid_at).toLocaleString("fr-FR")} · Réf: {c.payment_reference || "—"}
          </p>
        )}
      </div>
    );
  }

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
          <h1 style={{ display: "flex", alignItems: "center", gap: 10 }}><WalletIcon size={28} /> Gestion des payouts</h1>
          <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.7 }}>
            <strong style={{ display: "block", fontSize: "0.9rem" }}>Vendeurs</strong>
            <span style={{ display: "block" }}>À payer : <strong>{sum(toPay).toLocaleString("fr-FR")} FCFA</strong> ({toPay.length})</span>
            <span style={{ display: "block" }}>Séquestrés : <strong>{sum(held).toLocaleString("fr-FR")} FCFA</strong> ({held.length})</span>
            <span style={{ display: "block" }}>Déjà payés : <strong>{sum(paid).toLocaleString("fr-FR")} FCFA</strong> ({paid.length})</span>
          </p>
          <p style={{ marginTop: 8, fontSize: "0.85rem", lineHeight: 1.7 }}>
            <strong style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.9rem" }}><TruckIcon size={14} /> Livreurs</strong>
            <span style={{ display: "block" }}>À payer : <strong>{sumCourier(couriersDue).toLocaleString("fr-FR")} FCFA</strong> ({couriersDue.length})</span>
            <span style={{ display: "block" }}>Déjà payés : <strong>{sumCourier(couriersPaid).toLocaleString("fr-FR")} FCFA</strong> ({couriersPaid.length})</span>
          </p>
          {serverMode === "auto" && (
            <p style={{ fontSize: "0.8rem", color: "var(--millet-600)", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
              <ZapIcon size={14} /> Mode automatique activé — les paiements sont envoyés via l'API CinetPay
            </p>
          )}
        </div>

        {message && <div className="success-box">{message}</div>}

        {loading ? <p>Chargement...</p> : (
          <>
            <h2 style={{ fontSize: "1rem", margin: "16px 0 8px", display: "flex", alignItems: "center", gap: 6 }}>
              <StoreIcon size={16} /> Vendeurs — à payer maintenant ({toPay.length})
            </h2>
            {toPay.length === 0 ? <p style={{ fontSize: "0.85rem", color: "var(--ink-400)" }}>Aucun payout en attente de versement.</p> : toPay.map(renderVendorRow)}

            <h2 style={{ fontSize: "1rem", margin: "20px 0 8px", display: "flex", alignItems: "center", gap: 6 }}>
              <LockIcon size={16} /> Vendeurs — séquestrés ({held.length})
            </h2>
            {held.length === 0 ? <p style={{ fontSize: "0.85rem", color: "var(--ink-400)" }}>Aucun fonds séquestré.</p> : held.map(renderVendorRow)}

            <h2 style={{ fontSize: "1rem", margin: "24px 0 8px", display: "flex", alignItems: "center", gap: 6 }}>
              <TruckIcon size={16} /> Livreurs à payer ({couriersDue.length})
            </h2>
            {couriersDue.length === 0 ? <p style={{ fontSize: "0.85rem", color: "var(--ink-400)" }}>Aucun livreur en attente de paiement. L'argent de livraison ne s'affiche ici que pour les commandes livrées par Kimoxa (pas par la boutique elle-même).</p> : couriersDue.map(renderCourierRow)}

            <h2 style={{ fontSize: "1rem", margin: "24px 0 8px", display: "flex", alignItems: "center", gap: 6 }}>
              <CreditCardIcon size={16} /> Historique — vendeurs payés ({paid.length})
            </h2>
            {paid.length === 0 ? <p style={{ fontSize: "0.85rem", color: "var(--ink-400)" }}>Aucun versement vendeur effectué.</p> : paid.map(renderVendorRow)}

            {couriersPaid.length > 0 && (
              <>
                <h2 style={{ fontSize: "1rem", margin: "24px 0 8px", display: "flex", alignItems: "center", gap: 6 }}>
                  <CreditCardIcon size={16} /> Historique — livreurs payés ({couriersPaid.length})
                </h2>
                {couriersPaid.map(renderCourierRow)}
              </>
            )}
          </>
        )}
      </div>
      <AdminBottomNav />

      {payingPayout && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }} onClick={closeModal}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "white", borderRadius: 12, padding: 24, maxWidth: 480, width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ margin: "0 0 8px", fontSize: "1.2rem", display: "flex", alignItems: "center", gap: 8 }}>
                <WalletIcon size={20} /> Paiement au vendeur
              </h2>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--ink-500)" }}>
                <strong>{payingPayout.shop_name}</strong> · {payingPayout.vendor_name}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--ink-400)" }}>Commande #{payingPayout.order_id}</p>
            </div>

            <div style={{ background: "#faf7f2", border: "1px dashed var(--border)", borderRadius: 8, padding: 12, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: "0.85rem" }}><span>Brut vendu</span><span>{Number(payingPayout.gross_amount).toLocaleString("fr-FR")} FCFA</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: "0.85rem" }}>
                <span>Commission Kimoxa ({Number(payingPayout.gross_amount) > 0 ? ((Number(payingPayout.commission_amount) / Number(payingPayout.gross_amount)) * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) : "9"}%)</span>
                <span>− {Number(payingPayout.commission_amount).toLocaleString("fr-FR")} FCFA</span>
              </div>
              {Number(payingPayout.delivery_fee_amount || 0) > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: "0.85rem" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><TruckIcon size={14} /> Livraison (boutique livre)</span>
                  <span>+ {Number(payingPayout.delivery_fee_amount).toLocaleString("fr-FR")} FCFA</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid var(--border)", fontWeight: 700 }}>
                <span>Montant dû</span><span>{Number(payingPayout.payout_amount).toLocaleString("fr-FR")} FCFA</span>
              </div>
            </div>

            <form onSubmit={submitPayout}>
              {formError && <div className="error-box" style={{ marginBottom: 12 }}>{formError}</div>}

              {serverMode === "auto" && (
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: "0.85rem", marginBottom: 8, fontWeight: 600 }}>Mode de paiement *</label>
                  <div className="payment-options">
                    <label className={`payment-option ${payMode === "auto" ? "selected" : ""}`}>
                      <input type="radio" name="payMode" value="auto" checked={payMode === "auto"} onChange={() => setPayMode("auto")} />
                      <div>
                        <div className="payment-option-title" style={{ display: "flex", alignItems: "center", gap: 6 }}><ZapIcon size={16} /> Automatique (API payout)</div>
                        <div className="payment-option-desc">Argent envoyé instantanément au Mobile Money du vendeur, référence fournie par l'API.</div>
                      </div>
                    </label>
                    <label className={`payment-option ${payMode === "manual" ? "selected" : ""}`}>
                      <input type="radio" name="payMode" value="manual" checked={payMode === "manual"} onChange={() => setPayMode("manual")} />
                      <div>
                        <div className="payment-option-title" style={{ display: "flex", alignItems: "center", gap: 6 }}><PencilIcon size={16} /> Manuel</div>
                        <div className="payment-option-desc">Vous envoyez l'argent puis saisissez la référence (secours, espèces, virement).</div>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {payMode === "auto" && (
                <div style={{ background: "#ecfdf5", border: "1px dashed #10b981", borderRadius: 8, padding: 12, marginBottom: 16, fontSize: "0.85rem" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><SmartphoneIcon size={14} /> <strong>Destination :</strong> {payingPayout.mobile_money_number || payingPayout.vendor_phone}</span>
                  {" · "}
                  {payingPayout.mobile_money_provider === "moov" ? "Moov Money" : "Orange Money"}
                  <br />
                  <small style={{ color: "var(--ink-400)", display: "block", marginTop: 4 }}>La référence de transaction sera générée automatiquement par l'API.</small>
                </div>
              )}

              {payMode === "manual" && (
                <>
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label style={{ display: "block", fontSize: "0.85rem", marginBottom: 4, fontWeight: 600 }}>Montant payé *</label>
                    <input type="number" step="1" min="0" value={form.amountPaid} onChange={(e) => setForm({ ...form, amountPaid: e.target.value })} required
                      style={{ width: "100%", padding: "10px 12px", border: `2px solid ${form.amountPaid && !isAmountMatch ? "#dc2626" : isAmountMatch ? "#16a34a" : "var(--border)"}`, borderRadius: 8, fontSize: "1rem", fontWeight: 600 }}
                      placeholder={String(payingPayout.payout_amount)} />
                    {form.amountPaid && isAmountMatch && <small style={{ color: "#16a34a", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: 4 }}><CheckCircleIcon size={12} /> Montant cohérent</small>}
                    {form.amountPaid && !isAmountMatch && <small style={{ color: "#dc2626", fontSize: "0.75rem" }}>x Doit correspondre à {expectedAmount.toLocaleString("fr-FR")} FCFA (±1%)</small>}
                  </div>

                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label style={{ display: "block", fontSize: "0.85rem", marginBottom: 4, fontWeight: 600 }}>Méthode de paiement *</label>
                    <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} required
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: "0.95rem" }}>
                      {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label style={{ display: "block", fontSize: "0.85rem", marginBottom: 4, fontWeight: 600 }}>Référence de transaction *</label>
                    <input type="text" value={form.transactionReference} onChange={(e) => setForm({ ...form, transactionReference: e.target.value })} required minLength={5} maxLength={100}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: "0.95rem", fontFamily: "monospace" }}
                      placeholder="Ex: OM-2026-08-12-78451" />
                    <small style={{ color: "var(--ink-400)", fontSize: "0.75rem" }}>Numéro de transaction Mobile Money ou virement (min 5 caractères)</small>
                  </div>

                  <div className="form-group" style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: "0.85rem", marginBottom: 4, fontWeight: 600 }}>Notes <span style={{ fontWeight: 400, color: "var(--ink-400)" }}>(optionnel)</span></label>
                    <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={500} rows={3}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: "0.95rem", resize: "vertical", fontFamily: "inherit" }}
                      placeholder="Informations complémentaires..." />
                    <small style={{ color: "var(--ink-400)", fontSize: "0.75rem" }}>{form.notes.length}/500 caractères</small>
                  </div>
                </>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={closeModal} disabled={submitting} style={{ flex: 1 }}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={submitting || (payMode === "manual" && (!form.amountPaid || !isAmountMatch || form.transactionReference.trim().length < 5))} style={{ flex: 2, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  {submitting ? "Versement..." : <><CheckCircleIcon size={16} /> Confirmer le versement</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {payingCourier && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }} onClick={() => setPayingCourier(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "white", borderRadius: 12, padding: 24, maxWidth: 420, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <h2 style={{ margin: "0 0 8px", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: 8 }}>
              <TruckIcon size={20} /> Paiement du livreur
            </h2>
            <p style={{ margin: "0 0 4px", fontSize: "0.85rem", color: "var(--ink-500)" }}>Commande #{payingCourier.order_id}</p>
            <p style={{ margin: "0 0 12px", fontSize: "0.8rem", color: "var(--ink-400)" }}>{payingCourier.shipping_address}</p>
            <div style={{ background: "#ecfdf5", border: "1px dashed #10b981", borderRadius: 8, padding: 12, marginBottom: 16, textAlign: "center" }}>
              <div style={{ fontSize: "0.85rem", color: "var(--ink-500)" }}>Montant à verser</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--ink-900)" }}>{Number(payingCourier.amount).toLocaleString("fr-FR")} FCFA</div>
            </div>
            {courierError && <div className="error-box" style={{ marginBottom: 12 }}>{courierError}</div>}
            <form onSubmit={submitCourier}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: "0.85rem", marginBottom: 4, fontWeight: 600 }}>Référence de paiement *</label>
                <input type="text" value={courierRef} onChange={(e) => setCourierRef(e.target.value)} minLength={5} maxLength={100} required
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, fontFamily: "monospace" }}
                  placeholder="Ex: OM-2026-08-12-12345" />
                <small style={{ color: "var(--ink-400)", fontSize: "0.75rem" }}>Numéro de transaction Mobile Money versé au livreur (min 5 caractères)</small>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setPayingCourier(null)} disabled={submitting} style={{ flex: 1 }}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={submitting || courierRef.trim().length < 5} style={{ flex: 2, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  {submitting ? "Paiement..." : <><CheckCircleIcon size={16} /> Confirmer</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
