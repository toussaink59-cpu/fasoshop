"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

const POLL_MS = 4000;

export default function ConversationThreadPage() {
  const { id } = useParams();
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [myRole, setMyRole] = useState(null);
  const [shopName, setShopName] = useState("");
  const [orderId, setOrderId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  const loadMessages = useCallback(async () => {
    const res = await fetch(`/api/conversations/${id}/messages`);
    if (res.status === 403) {
      router.push("/messages");
      return;
    }
    const data = await res.json();
    setMessages(data.messages || []);
    setMyRole(data.myRole);
    setShopName(data.shopName || "");
    setOrderId(data.orderId);
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    loadMessages();
    const timer = setInterval(loadMessages, POLL_MS);
    return () => clearInterval(timer);
  }, [loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    setError("");

    const res = await fetch(`/api/conversations/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text.trim() }),
    });
    const data = await res.json();
    setSending(false);

    if (!res.ok) {
      setError(data.error || "Erreur lors de l'envoi du message.");
      return;
    }

    setText("");
    loadMessages();
  }

  const backLink = myRole === "vendor" ? "/messages" : "/messages";

  return (
    <div className="shell">
      <div className="topbar">
        <Link href={backLink} className="brand" style={{ textDecoration: "none" }}>← Messages</Link>
        <div className="topbar-actions">
          {orderId && <span style={{ color: "var(--sand-50)", fontSize: "0.85rem" }}>Commande #{orderId}</span>}
        </div>
      </div>
      <div className="woven-strip" />

      <div className="content" style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", minHeight: "60vh" }}>
        <div className="page-header">
          <h1>{shopName || "Conversation"}</h1>
        </div>

        {error && <div className="error-box">{error}</div>}

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          {loading ? (
            <p>Chargement...</p>
          ) : messages.length === 0 ? (
            <p style={{ color: "var(--ink-400)", textAlign: "center", marginTop: 40 }}>
              Aucun message pour l'instant — écrivez le premier !
            </p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`chat-bubble ${m.sender_role === myRole ? "chat-bubble-mine" : "chat-bubble-theirs"}`}
              >
                <p style={{ margin: 0 }}>{m.body}</p>
                <span className="chat-bubble-time">
                  {new Date(m.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} style={{ display: "flex", gap: 8, position: "sticky", bottom: 16 }}>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Écrire un message..."
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-primary" disabled={sending || !text.trim()}>
            Envoyer
          </button>
        </form>
      </div>
    </div>
  );
}
