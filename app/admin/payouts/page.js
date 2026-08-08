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

export default function AdminPayoutsPage() {
  const router = useRouter();
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/payouts");
    if (res.status === 401 || res.status === 403) {
      router.push("/login");
      return;
    }
    const data = await res.json();
    setPayouts(data.payouts || []);
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

  async function handlePay(payout) {
    if (!window.confirm(
      `Verser ${Number(payout.payout_amount).toLocaleString("fr-FR")} FCFA à ${payout.vendor_name} (${payout.shop_name}) ?\n\nCommission Kimoxa conservée : ${Number(payout.commission_amount).toLocaleString("fr-FR")} FCFA`
    )) return;

    setBusyId(payout.id);
    setMessage("");
    const res = await fetch(`/api/admin/payouts/${payout.id}`, { method: "POST" });
    const data = await res.json();
    setBusyId(null);

    if (!res.ok) {
      setMessage(data.error || "Erreur lors du versement.");
      return;
    }
    setMessage(`✅ ${Number(payout.payout_amount).toLocaleString("fr-FR")} FCFA versés à ${payout.vendor_name}.`);
    load();
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const toPay = payouts.filter((p) => p.payout_status === "released");
  const held = payouts.filter((p) => p.payout_status === "held");
  const paid = payouts.filter((p) => p.payout_status === "paid");

  const sum = (list) => list.reduce((t, p) => t + Number(p.payout_amount || 0), 0);

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
            onClick={() => handlePay(p)}
            disabled={busyId === p.id}
          >
            💸 {busyId === p.id ? "Versement..." : "Verser au vendeur (Mobile Money)"}
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
    </div>
  );
}
