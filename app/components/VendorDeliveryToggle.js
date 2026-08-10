"use client";

import { useEffect, useState } from "react";

// 🏪 Interrupteur : la boutique livre elle-même ses commandes.
// Activé → les frais de livraison vont à la boutique.
// Désactivé → les frais de livraison vont aux livreurs Kimoxa.
export default function VendorDeliveryToggle() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/vendor/shop/delivery")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setEnabled(Boolean(d.enabled)); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function toggle() {
    setSaving(true);
    setMsg("");
    const next = !enabled;
    try {
      const res = await fetch("/api/vendor/shop/delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      if (res.ok) {
        setEnabled(next);
        setMsg(
          next
            ? "✅ Vous livrez vous-même : les frais de livraison seront ajoutés à vos payouts."
            : "✅ Livraison confiée aux livreurs Kimoxa."
        );
      } else {
        setMsg("❌ Impossible de modifier le réglage.");
      }
    } catch {
      setMsg("❌ Impossible de contacter le serveur.");
    }
    setSaving(false);
  }

  return (
    <div className="order-card" style={{ marginBottom: 12, padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div>
          <strong>🏪 Je livre moi-même mes commandes</strong>
          <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "var(--ink-400)", lineHeight: 1.5 }}>
            Si activé, les frais de livraison payés par vos clients vous sont reversés avec vos ventes.
            Si désactivé, Kimoxa s'occupe de livrer et les frais vont au livreur.
          </p>
        </div>
        <button
          className="btn btn-primary"
          style={{ minWidth: 90 }}
          onClick={toggle}
          disabled={saving || loading}
        >
          {saving ? "..." : enabled ? "✅ Activé" : "Désactivé"}
        </button>
      </div>
      {msg && <p style={{ margin: "8px 0 0", fontSize: "0.78rem", color: "var(--ink-700)" }}>{msg}</p>}
    </div>
  );
}
