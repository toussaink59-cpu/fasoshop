"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import SiteHeader from "@/app/components/SiteHeader";
import BottomNav from "@/app/components/BottomNav";

const POLL_MS = 4000;

function formatTime(date) {
  return new Date(date).toLocaleString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ConversationThreadClient({ id, initialThread, initialUser, categories }) {
  const [messages, setMessages] = useState(initialThread.messages);
  const [myRole] = useState(initialThread.myRole);
  const [shopName] = useState(initialThread.shopName);
  const [orderId] = useState(initialThread.orderId);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const isFirstRun = useRef(true);

  const loadMessages = useCallback(async () => {
    const res = await fetch(`/api/conversations/${id}/messages`);
    if (res.status === 403) return;
    const data = await res.json();
    setMessages(data.messages || []);
  }, [id]);

  useEffect(() => {
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

  async function sendMessage(payload) {
    setSending(true);
    setError("");
    const res = await fetch(`/api/conversations/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) {
      setError(data.error || "Erreur lors de l'envoi.");
      return;
    }
    setText("");
    loadMessages();
  }

  function handleSend(e) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    sendMessage({ body: text.trim() });
  }

  async function handleAttach(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const upRes = await fetch("/api/vendor/upload", { method: "POST", body: fd });
      const upData = await upRes.json();
      if (!upRes.ok) throw new Error(upData.error || "Upload échoué");
      await sendMessage({ body: "", imageUrl: upData.url });
    } catch (err) {
      setError(err.message);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // OPTION B : l'acheteur voit "Support Kimoxa", le vendeur voit le nom de sa boutique
  const headerName = myRole === "buyer" ? "Support Kimoxa" : (shopName || "Conversation");

  return (
    <div className="shell chat-shell">
      <SiteHeader initialUser={initialUser} categories={categories} />

      <div className="chat-thread-wrap">
        {/* En-tête conversation */}
        <div className="chat-thread-header">
          <Link href="/messages" className="chat-back-btn" aria-label="Retour">←</Link>
          <div className="chat-thread-title">
            <strong>{headerName}</strong>
            {orderId && <span>Commande #{orderId}</span>}
          </div>
        </div>

        {error && <div className="chat-error">{error}</div>}

        {/* Fil de messages */}
        <div className="chat-thread-body">
          {messages.length === 0 ? (
            <div className="chat-empty-thread">
              <p>Aucun message — écrivez le premier !</p>
            </div>
          ) : (
            messages.map((m) => {
              const mine = m.sender_role === myRole;
              return (
                <div
                  key={m.id}
                  className={`chat-bubble ${mine ? "chat-bubble-mine" : "chat-bubble-theirs"}`}
                >
                  {m.image_url ? (
                    <img src={m.image_url} alt="Photo partagée" className="chat-bubble-img" />
                  ) : null}
                  {m.body && <p>{m.body}</p>}
                  <span className="chat-bubble-time">{formatTime(m.created_at)}</span>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Barre d'envoi façon WhatsApp */}
        <form className="chat-composer" onSubmit={handleSend}>
          <button
            type="button"
            className="chat-composer-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            aria-label="Joindre une photo"
            title="Joindre une photo"
          >
            {uploading ? "…" : "📎"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: "none" }}
            onChange={handleAttach}
          />
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Écrire un message..."
            disabled={sending}
          />
          <button
            type="submit"
            className="chat-composer-send"
            disabled={sending || !text.trim()}
            aria-label="Envoyer"
          >
            ➤
          </button>
        </form>
      </div>

      <BottomNav user={initialUser} />
    </div>
  );
}
