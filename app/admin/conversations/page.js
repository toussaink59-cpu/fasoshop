"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminBottomNav from "@/app/components/AdminBottomNav";
import KimoxaLogo from "@/app/components/KimoxaLogo";

export default function AdminConversationsPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [loadingThread, setLoadingThread] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/conversations");
    if (res.status === 401 || res.status === 403) {
      router.push("/login");
      return;
    }
    const data = await res.json();
    setConversations(data.conversations || []);
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

  async function openThread(id) {
    setLoadingThread(true);
    const res = await fetch(`/api/admin/conversations/${id}`);
    if (res.ok) {
      setSelected(await res.json());
    }
    setLoadingThread(false);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
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
        {selected ? (
          <>
            <div className="vendor-dashboard-header">
              <button className="btn btn-ghost" onClick={() => setSelected(null)} style={{ marginBottom: 10 }}>
                ← Toutes les conversations
              </button>
              <h1>💬 #{selected.conversation.id}</h1>
              <p>
                🏪 {selected.conversation.shop_name} ({selected.conversation.vendor_name}) ↔ 👤 {selected.conversation.buyer_name} · Commande #{selected.conversation.order_id}
              </p>
            </div>

            {loadingThread ? (
              <p>Chargement...</p>
            ) : (
              <div className="chat-thread-body" style={{ minHeight: 300 }}>
                {selected.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`chat-bubble ${m.sender_role === "vendor" ? "chat-bubble-mine" : "chat-bubble-theirs"}`}
                  >
                    <span style={{ fontSize: "0.62rem", fontWeight: 800, display: "block", marginBottom: 2 }}>
                      {m.sender_role === "vendor" ? "🏪 Vendeur" : "👤 Client"} : {m.sender_name}
                    </span>
                    {m.image_url && <img src={m.image_url} alt="Photo" className="chat-bubble-img" />}
                    {m.body && <p>{m.body}</p>}
                    <span className="chat-bubble-time">
                      {new Date(m.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="vendor-dashboard-header">
              <h1>💬 Surveillance des conversations</h1>
              <p>{conversations.length} conversation{conversations.length > 1 ? "s" : ""} — vous voyez TOUT ce qui s'échange entre vendeurs et clients.</p>
            </div>

            {loading ? (
              <p>Chargement...</p>
            ) : conversations.length === 0 ? (
              <div className="empty-state">
                <div className="glyph">💬</div>
                <p>Aucune conversation pour l'instant.</p>
              </div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  className="order-card"
                  style={{ width: "100%", textAlign: "left", cursor: "pointer", background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: 14, marginBottom: 10, display: "block" }}
                  onClick={() => openThread(c.id)}
                  disabled={loadingThread}
                >
                  <div className="order-head">
                    <div>
                      <strong>🏪 {c.shop_name} ↔ 👤 {c.buyer_name}</strong>
                      <span className="order-date">Commande #{c.order_id} · {c.message_count} message{c.message_count > 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  <p style={{ margin: "8px 0 0", fontSize: "0.85rem", color: "var(--ink-400)" }}>
                    {c.last_message || "—"}
                  </p>
                </button>
              ))
            )}
          </>
        )}
      </div>
      <AdminBottomNav />
    </div>
  );
}