"use client";

// lib/toast.js
// P2-15 (enhancement) : systeme de notifications toast pour remplacer les alert()

import { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

const TOAST_COLORS = {
  success: { bg: "#ecfdf5", border: "#10b981", text: "#065f46", icon: "✓" },
  error: { bg: "#fef2f2", border: "#ef4444", text: "#991b1b", icon: "✕" },
  warning: { bg: "#fffbeb", border: "#f59e0b", text: "#92400e", icon: "⚠" },
  info: { bg: "#eff6ff", border: "#3b82f6", text: "#1e40af", icon: "ℹ" },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((type, message, options = {}) => {
    const id = Date.now() + Math.random();
    const duration = options.duration || 5000;
    setToasts((prev) => [...prev, { id, type, message, duration }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const toast = useCallback(
    (message, options = {}) => addToast(options.type || "info", message, options),
    [addToast]
  );
  toast.success = (msg, opts) => addToast("success", msg, opts);
  toast.error = (msg, opts) => addToast("error", msg, opts);
  toast.warning = (msg, opts) => addToast("warning", msg, opts);
  toast.info = (msg, opts) => addToast("info", msg, opts);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxWidth: 400,
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => {
          const c = TOAST_COLORS[t.type] || TOAST_COLORS.info;
          return (
            <div
              key={t.id}
              style={{
                background: c.bg,
                border: `1px solid ${c.border}`,
                color: c.text,
                padding: "12px 16px",
                borderRadius: 8,
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                fontSize: 14,
                lineHeight: 1.4,
                pointerEvents: "auto",
                animation: "toast-slide-in 0.25s ease-out",
              }}
            >
              <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{c.icon}</span>
              <span style={{ flex: 1, whiteSpace: "pre-wrap" }}>{t.message}</span>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes toast-slide-in {
          from { transform: translateX(110%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback dev : evite les crash si provider absent
    const fallback = (msg) => console.log("[toast]", msg);
    fallback.success = (msg) => console.log("[toast:success]", msg);
    fallback.error = (msg) => console.log("[toast:error]", msg);
    fallback.warning = (msg) => console.log("[toast:warning]", msg);
    fallback.info = (msg) => console.log("[toast:info]", msg);
    return fallback;
  }
  return ctx;
}
