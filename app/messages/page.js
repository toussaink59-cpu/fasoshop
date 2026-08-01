"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function MessagesListPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) {
          router.push("/login");
          return;
        }
        setUser(d.user);
        fetch("/api/conversations")
          .then((r) => r.json())
          .then((data) => {
            setConversations(data.conversations || []);
            setLoading(false);
          });
      });
  }, [router]);

  const backLink = user?.role === "vendor" ? "/vendor/dashboard" : "/orders";
  const backLabel = user?.role === "vendor" ? "Retour au tableau de bord" : "Retour à mes commandes";

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/" className="brand" style={{ textDecoration: "none" }}>🛒 FasoShop</Link>
        <div className="topbar-actions">
          <Link href={backLink}><button>{backLabel}</button></Link>
        </div>
      </div>
      <div className="woven-strip" />

      <div className="content" style={{ maxWidth: 720, margin: "0 auto" }}>
        <div className="page-header">
          <h1>Messages</h1>
        </div>

        {loading ? (
          <p>Chargement...</p>
        ) : conversations.length === 0 ? (
          <div className="empty-state">
            <div className="glyph">💬</div>
            <p>Aucune conversation pour l'instant.</p>
          </div>
        ) : (
          <div className="panel" style={{ padding: 0 }}>
            {conversations.map((c, i) => (
              <Link
                href={`/messages/${c.id}`}
                key={c.id}
                className="conversation-row"
                style={{ borderBottom: i < conversations.length - 1 ? "1px solid var(--border)" : "none" }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 700 }}>{c.other_party_name}</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--ink-400)" }}>· Commande #{c.order_id}</span>
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--ink-400)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.last_message || "Démarrer la conversation..."}
                  </p>
                </div>
                {c.unread_count > 0 && (
                  <span className="conversation-unread-badge">{c.unread_count}</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
