"use client";

import { useEffect, useState } from "react";
import { SmartphoneIcon, XIcon } from "@/app/components/Icons";

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Déjà installé
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (window.navigator.standalone === true) return;
    
    // Déjà dismissé
    try {
      if (localStorage.getItem("pwa-install-dismissed") === "1") return;
    } catch {}

    // Android/PC Chrome : beforeinstallprompt
    function onBeforeInstallPrompt(e) {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    // iPhone Safari : pas d'invite native
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIos && !window.navigator.standalone) {
      setShowIosHint(true);
      setVisible(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === "accepted" || outcome === "dismissed") {
      setVisible(false);
      try { localStorage.setItem("pwa-install-dismissed", "1"); } catch {}
    }
  }

  function handleDismiss() {
    setVisible(false);
    try { localStorage.setItem("pwa-install-dismissed", "1"); } catch {}
  }

  if (!visible) return null;

  if (deferredPrompt) {
    return (
      <div className="pwa-install-banner">
        <span className="pwa-install-icon" style={{ display: "inline-flex" }}>
          <SmartphoneIcon size={24} />
        </span>
        <div className="pwa-install-text">
          <strong>Installez Kimoxa</strong>
          <span>Accès rapide depuis votre écran d'accueil</span>
        </div>
        <button className="btn btn-primary" onClick={handleInstall}>
          Installer
        </button>
        <button
          className="pwa-install-close"
          onClick={handleDismiss}
          aria-label="Fermer"
        >
          <XIcon size={18} />
        </button>
      </div>
    );
  }

  if (showIosHint) {
    return (
      <div className="pwa-install-banner">
        <span className="pwa-install-icon" style={{ display: "inline-flex" }}>
          <SmartphoneIcon size={24} />
        </span>
        <div className="pwa-install-text">
          <strong>Installez Kimoxa sur iPhone</strong>
          <span>Appuyez sur Partager puis « Sur l'écran d'accueil »</span>
        </div>
        <button
          className="pwa-install-close"
          onClick={handleDismiss}
          aria-label="Fermer"
        >
          <XIcon size={18} />
        </button>
      </div>
    );
  }

  return null;
}
