"use client";

import { StoreIcon } from "@/app/components/Icons";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Interrupteur : la boutique livre elle-même ses commandes.
export default function VendorDeliveryToggle() {
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  // Détection mobile (SSR-safe)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

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
        setEnabled(Boolean(data.enabled));
        setMsg(
          data.enabled
            ? "Vous livrez vous-même : les frais de livraison seront ajoutés à vos payouts."
            : "Livraison confiée aux livreurs Kimoxa."
        );
      } else {
        setError(data.error || "Impossible de modifier le réglage.");
      }
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setSaving(false);
    }
  }

  // Styles adaptatifs (inline, zéro CSS global)
  const buttonStyle = isMobile
    ? {
        minWidth: 40,
        height: 36,
        padding: "0 10px",
        fontSize: "1.1rem",
        borderRadius: 8,
      }
    : {
        minWidth: 90,
        padding: "8px 14px",
        fontSize: "0.85rem",
        borderRadius: 8,
      };

  const buttonLabel = isMobile
    ? (saving ? "..." : enabled ? "ON" : "OFF")
    : (saving ? "..." : enabled ? "Activé" : "Désactivé");

  const buttonTitle = enabled
    ? "Livraison assurée par vous (cliquez pour désactiver)"
    : "Livraison assurée par Kimoxa (cliquez pour activer)";

  return (
    <div className="order-card" style={{ marginBottom: 12, padding: isMobile ? 12 : 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: isMobile ? 8 : 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ fontSize: isMobile ? "0.85rem" : "0.95rem" }}>
            <StoreIcon size={16} style={{ marginRight: 4 }} /> Je livre moi-même mes commandes
          </strong>
          <p style={{ margin: "4px 0 0", fontSize: isMobile ? "0.72rem" : "0.78rem", color: "var(--ink-400)", lineHeight: 1.4 }}>
            {isMobile
              ? "Frais de livraison reversés si activé."
              : "Si activé, les frais de livraison payés par vos clients vous sont reversés avec vos ventes. Si désactivé, Kimoxa s'occupe de livrer et les frais vont au livreur."}
          </p>
        </div>
        <button
          className="btn btn-primary"
          style={buttonStyle}
          onClick={toggle}
          disabled={saving || loading}
          title={buttonTitle}
          aria-label={buttonTitle}
        >
          {buttonLabel}
        </button>
      </div>
      {error && <p style={{ margin: "8px 0 0", fontSize: "0.78rem", color: "#dc2626" }}>{error}</p>}
      {msg && !error && <p style={{ margin: "8px 0 0", fontSize: "0.78rem", color: "#16a34a" }}>{msg}</p>}
    </div>
  );
}
