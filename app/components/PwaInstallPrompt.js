"use client";

import { useEffect, useState } from "react";

// Bannière d'installation PWA :
// - Android/PC Chrome : bouton "Installer" (déclenche l'invite native)
// - iPhone Safari : mini-guide (Partager → Sur l'écran d'accueil)
export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // App déjà installée (mode autonome) → ne rien montrer
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (typeof window !== "undefined" && localStorage.getItem("pwa-install-dismissed")) return;

    function onBeforeInstallPrompt(e) {
      e.preventDefault();
      setDeferredPrompt(e);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    // iPhone : pas d'invite native → on affiche le guide
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = window.navigator.standalone === true;
    if (isIos && !isStandalone) setShowIosHint(true);

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    setDismissed(true);
    try {
      localStorage.setItem("pwa-install-dismissed", "1");
    } catch {}
  }

  if (dismissed) return null;

  if (deferredPrompt) {
    return (
      <div className="pwa-install-banner">
        <span className="pwa-install-icon">📲</span>
        <div className="pwa-install-text">
          <strong>Installez Kimoxa</strong>
          <span>Accès rapide depuis votre écran d'accueil</span>
        </div>
        <button className="btn btn-primary" onClick={handleInstall}>Installer</button>
        <button className="pwa-install-close" onClick={handleDismiss} aria-label="Fermer">✕</button>
      </div>
    );
  }

  if (showIosHint) {
    return (
      <div className="pwa-install-banner">
        <span className="pwa-install-icon">📲</span>
        <div className="pwa-install-text">
          <strong>Installez Kimoxa sur iPhone</strong>
          <span>Appuyez sur Partager 📤 puis « Sur l'écran d'accueil »</span>
        </div>
        <button className="pwa-install-close" onClick={handleDismiss} aria-label="Fermer">✕</button>
      </div>
    );
  }

  return null;
}
