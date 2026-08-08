"use client";

import { useEffect } from "react";

// Enregistre le service worker UNIQUEMENT en production
// (évite les problèmes de cache en développement)
export default function ServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
