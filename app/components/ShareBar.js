"use client";

import { useState } from "react";
import { ShareIcon, LinkIcon, MessageIcon } from "@/app/components/Icons";

function FacebookIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/>
    </svg>
  );
}
function XIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}
function TikTokIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005.8 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1.84-.1z"/>
    </svg>
  );
}

export default function ShareBar({ title, price, url }) {
  const [copied, setCopied] = useState(false);
  const text = `${title} — ${price.toLocaleString("fr-FR")} FCFA sur Kimoxa`;

  const waUrl = `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`;
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`;
  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch {}
    } else {
      handleCopy();
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <span style={{ fontSize: "0.82rem", color: "var(--ink-400)", fontWeight: 600 }}>Partager :</span>
      <a href={waUrl} target="_blank" rel="noopener noreferrer" aria-label="Partager sur WhatsApp" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: "50%", background: "#25D366", color: "#fff" }}>
        <MessageIcon size={18} />
      </a>
      <a href={fbUrl} target="_blank" rel="noopener noreferrer" aria-label="Partager sur Facebook" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: "50%", background: "#1877F2", color: "#fff" }}>
        <FacebookIcon size={18} />
      </a>
      <a href={xUrl} target="_blank" rel="noopener noreferrer" aria-label="Partager sur X" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: "50%", background: "#000", color: "#fff" }}>
        <XIcon size={18} />
      </a>
      <button onClick={shareNative} aria-label="Partager via TikTok et autres apps" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: "50%", background: "#ff0050", color: "#fff", border: "none", cursor: "pointer" }}>
        <TikTokIcon size={18} />
      </button>
      <button onClick={handleCopy} aria-label="Copier le lien" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: "50%", background: "var(--sand-200)", color: "var(--ink-700)", border: "none", cursor: "pointer" }}>
        {copied ? <span style={{ fontSize: "0.75rem", fontWeight: 700 }}>✓</span> : <LinkIcon size={16} />}
      </button>
      {copied && <span style={{ fontSize: "0.8rem", color: "var(--gold-600)", fontWeight: 600 }}>Lien copié !</span>}
    </div>
  );
}
