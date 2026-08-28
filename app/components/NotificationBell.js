"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BellIcon } from "@/app/components/Icons";

const TYPE_LABELS = {
  order_new: "Nouvelle commande",
  order_shipped: "Expédition",
  order_delivered: "Livraison",
  order_cancelled: "Annulation",
  payout_released: "Reversement disponible",
  payout_paid: "Reversement versé",
  message_new: "Message",
  shop_verified: "Boutique vérifiée",
  shop_rejected: "Boutique refusée",
  moderation_update: "Modération",
};

const TYPE_COLORS = {
  order_new: { bg: "#fff7ed", fg: "#c2410c" },
  order_shipped: { bg: "#eff6ff", fg: "#1d4ed8" },
  order_delivered: { bg: "#f0fdf4", fg: "#15803d" },
  order_cancelled: { bg: "#fef2f2", fg: "#b91c1c" },
  payout_released: { bg: "#fef9ee", fg: "#a16207" },
  payout_paid: { bg: "#fef9ee", fg: "#a16207" },
  message_new: { bg: "#f5f3ff", fg: "#6d28d9" },
  shop_verified: { bg: "#f0fdf4", fg: "#15803d" },
  shop_rejected: { bg: "#fef2f2", fg: "#b91c1c" },
  moderation_update: { bg: "#f5f3ff", fg: "#6d28d9" },
};

function formatAgo(d) {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "à l'instant";
  const m = Math.floor(s / 60);
  if (m < 60) return "il y a " + m + " min";
  const h = Math.floor(m / 60);
  if (h < 24) return "il y a " + h + " h";
  const day = Math.floor(h / 24);
  if (day < 7) return "il y a " + day + " j";
  return d.toLocaleDateString("fr-FR");
}

export default function NotificationBell() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  async function load() {
    try {
      setLoading(true);
      const res = await fetch("/api/notifications?limit=15");
      if (res.ok) {
        const data = await res.json();
        setItems(data.notifications || []);
        setUnread(data.unread || 0);
      }
    } catch (e) {}
    setLoading(false);
  }

  // Hooks TOUJOURS appelés (avant tout return)
  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Return APRÈS les hooks
  const hiddenRoutes = ["/login", "/register", "/cgu", "/cgv", "/confidentialite", "/mentions-legales", "/comment-ca-marche"];
  if (hiddenRoutes.some((r) => pathname === r || pathname.startsWith(r + "/"))) return null;

  async function toggle() {
    if (!open) await load();
    setOpen((v) => !v);
  }

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
  }

  async function markOneRead(id) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    setUnread((u) => Math.max(0, u - 1));
  }

  function handleOpen(n) {
    if (!n.readAt) markOneRead(n.id);
    if (n.link) {
      setOpen(false);
      router.push(n.link);
    }
  }

  return (
    <div className="notif-bell-wrap" ref={panelRef} style={{ position: "fixed", right: 16, bottom: 154, zIndex: 9998 }}>
      <style>{`
        @media (min-width: 768px) {
          .notif-bell-wrap { right: 24px !important; bottom: 162px !important; }
        }
      `}</style>

      <button
        onClick={toggle}
        aria-label="Notifications"
        style={{
          position: "relative",
          width: 54,
          height: 54,
          borderRadius: "50%",
          background: "var(--gold-600, #d4af37)",
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "#fff",
          boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
        }}
      >
        <BellIcon size={24} />
        {unread > 0 && (
          <span style={{
            position: "absolute", top: 2, right: 2,
            minWidth: 18, height: 18, padding: "0 5px", borderRadius: 9,
            background: "var(--bissap-600, #c62828)", color: "#fff",
            fontSize: 11, fontWeight: 800,
            display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
          }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute",
          bottom: "calc(100% + 8px)",
          right: 0,
          width: "min(360px, calc(100vw - 24px))",
          background: "#fff",
          border: "1px solid var(--border, #e5e2d9)",
          borderRadius: 14,
          boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
          zIndex: 100,
          overflow: "hidden",
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 14px", borderBottom: "1px solid var(--border, #e5e2d9)",
          }}>
            <strong style={{ fontSize: "0.95rem" }}>
              Notifications{" "}
              {unread > 0 && <span style={{ color: "var(--bissap-600, #c62828)", fontSize: "0.78rem" }}>· {unread} non lue(s)</span>}
            </strong>
            {unread > 0 && (
              <button onClick={markAllRead} style={{
                background: "none", border: "none", color: "var(--gold-600)",
                fontSize: "0.78rem", fontWeight: 700, cursor: "pointer",
              }}>
                Tout marquer lu
              </button>
            )}
          </div>

          <div style={{ maxHeight: 420, overflowY: "auto" }}>
            {loading && items.length === 0 && (
              <div style={{ padding: 24, textAlign: "center", color: "#888", fontSize: "0.85rem" }}>Chargement…</div>
            )}
            {!loading && items.length === 0 && (
              <div style={{ padding: 24, textAlign: "center", color: "#888", fontSize: "0.85rem" }}>
                Aucune notification pour le moment.
              </div>
            )}
            {items.map((n) => {
              const colors = TYPE_COLORS[n.type] || { bg: "#f5f5f5", fg: "#444" };
              return (
                <div key={n.id} onClick={() => handleOpen(n)} style={{
                  display: "flex", gap: 10, padding: "10px 14px",
                  cursor: n.link ? "pointer" : "default",
                  background: n.readAt ? "#fff" : "#fafbfd",
                  borderBottom: "1px solid var(--border, #e5e2d9)",
                }}>
                  <span style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: colors.bg, color: colors.fg,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 800, flexShrink: 0,
                  }}>
                    {(TYPE_LABELS[n.type] || n.type || "?").charAt(0).toUpperCase()}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <strong style={{ fontSize: "0.85rem", color: "var(--ink-900)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {n.title}
                      </strong>
                      {!n.readAt && <span style={{ width: 6, height: 6, borderRadius: 3, background: "var(--bissap-600, #c62828)", flexShrink: 0 }} />}
                    </div>
                    {n.body && <div style={{ fontSize: "0.8rem", color: "var(--ink-500)", lineHeight: 1.4 }}>{n.body}</div>}
                    <div style={{ fontSize: "0.7rem", color: "var(--ink-400)", marginTop: 2 }}>{formatAgo(new Date(n.createdAt))}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
