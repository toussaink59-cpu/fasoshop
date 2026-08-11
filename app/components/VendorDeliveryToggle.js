"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// 🏪 Interrupteur : la boutique livre elle-même ses commandes.
// Activé → les frais de livraison vont à la boutique.
// Désactivé → les frais vont aux livreurs Kimoxa.
export default function VendorDeliveryToggle() {
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/vendor/shop/delivery")
      .then(async (r) => {
        if (r.status === 401 || r.status === 403) {
          router.push("/login");
          return null;
        }
        if (!r.ok) throw new Error("Chargement impossible.");
        return r.json();
      })
      .then((d) => {
        if (d) setEnabled(Boolean(d.enabled));
      })
      .catch(() => setError("Impossible de charger le réglage."))
      .finally(() => setLoading(false));
  }, [router]);

  async function toggle() {
    if (saving) return;
    setSaving(true);
    setError("");
    setMsg("");
    const next = !enabled;
    try {
      const res = await fetch("/api/vendor/shop/delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });

      if (res.status === 401 || res.status === 403) {
        router.push("/login");
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        // ✅ Source de vérité = serveur, pas la valeur optimiste client
        setEnabled(Boolean(data.enabled));
        setMsg(
          data.enabled
            ? "✅ Vous livrez vous-même : les frais de livraison seront ajoutés à vos payouts."
            : "✅ Livraison confiée aux livreurs Kimoxa."
        );
      } else {
        // ✅ Affiche le message serveur (précis)
        setError(data.error || "Impossible de modifier le réglage.");
      }
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setSaving(false);
    }
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
      {error && <p style={{ margin: "8px 0 0", fontSize: "0.78rem", color: "#dc2626" }}>{error}</p>}
      {msg && !error && <p style={{ margin: "8px 0 0", fontSize: "0.78rem", color: "#16a34a" }}>{msg}</p>}
    </div>
  );
}
