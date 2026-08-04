"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import SiteHeader from "@/app/components/SiteHeader";
import BottomNav from "@/app/components/BottomNav";

const POLL_MS = 4000;

export default function ConversationThreadClient({ id, initialThread, initialUser, categories }) {
  const [messages, setMessages] = useState(initialThread.messages);
  const [myRole] = useState(initialThread.myRole);
  const [shopName] = useState(initialThread.shopName);
  const [orderId] = useState(initialThread.orderId);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const isFirstRun = useRef(true);

  const loadMessages = useCallback(async () => {
    const res = await fetch(`/api/conversations/${id}/messages`);
    if (res.status === 403) return;
    const data = await res.json();
    setMessages(data.messages || []);
  }, [id]);

  useEffect(() => {
    // Le premier rendu contient déjà le fil résolu côté serveur — le
    // polling ne fait que rafraîchir en tâche de fond ensuite.
    const timer = setInterval(loadMessages, POLL_MS);
    return () => clearInterval(timer);
  }, [loadMessages]);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
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

  return (
    <div className="shell">
      <SiteHeader initialUser={initialUser} categories={categories} />

      <div className="content" style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", minHeight: "60vh" }}>
        <div className="page-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div>
            <Link href="/messages" style={{ fontSize: "0.85rem", color: "var(--ink-400)", textDecoration: "none" }}>← Messages</Link>
            <h1 style={{ margin: "4px 0 0" }}>{shopName || "Conversation"}</h1>
          </div>
          {orderId && <span style={{ color: "var(--ink-400)", fontSize: "0.85rem" }}>Commande #{orderId}</span>}
        </div>

        {error && <div className="error-box">{error}</div>}

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          {messages.length === 0 ? (
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

      <BottomNav user={initialUser} />
    </div>
  );
}
