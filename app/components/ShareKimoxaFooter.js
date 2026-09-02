"use client";

import { useToast } from "@/lib/toast";

export default function ShareKimoxaFooter() {
  const toast = useToast();
  const handleClick = (e) => {
    e.preventDefault();
    const url = typeof window !== "undefined" ? window.location.origin : "";
    const text = "Kimoxa — Marketplace locale. Achetez local, vivez grand.";
    if (navigator.share) {
      navigator.share({ title: "Kimoxa", text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => toast.success("Lien copié !")).catch(() => {});
    }
  };
  return (
    <a href="#" onClick={handleClick} style={{ cursor: "pointer", color: "var(--ink-600)" }}>
      Partager Kimoxa
    </a>
  );
}
