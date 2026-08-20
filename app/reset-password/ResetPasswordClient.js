"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ResetPasswordClient() {
  const [token, setToken] = useState(null);
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    setToken(t);
    if (!t) {
      setValid(false);
      setChecking(false);
      return;
    }
    fetch("/api/auth/reset-password?token=" + encodeURIComponent(t))
      .then((r) => r.json())
      .then((d) => setValid(!!d.valid))
      .catch(() => setValid(false))
      .finally(() => setChecking(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.error || "Une erreur est survenue.");
      }
    } catch {
      setError("Erreur reseau. Reessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  const shell = { minHeight: "100vh", background: "#faf6ef", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 };
  const card = { background: "#fff", borderRadius: 12, boxShadow: "0 4px 24px rgba(36,23,18,0.08)", maxWidth: 440, width: "100%", padding: 32, boxSizing: "border-box" };
  const input = { width: "100%", padding: 12, borderRadius: 8, border: "1px solid #d8cfc4", fontSize: 15, marginBottom: 16, boxSizing: "border-box" };
  const button = { width: "100%", background: submitting ? "#c9a86a" : "#e6a623", color: "#241712", fontWeight: 700, fontSize: 15, padding: 14, border: "none", borderRadius: 8, cursor: submitting ? "default" : "pointer" };

  return (
    <main style={shell}>
      <div style={card}>
        <h1 style={{ color: "#241712", fontSize: 22, margin: "0 0 8px" }}>Nouveau mot de passe</h1>

        {checking ? (
          <p style={{ color: "#6b5d52", fontSize: 14 }}>Verification du lien...</p>
        ) : success ? (
          <>
            <div style={{ background: "#eaf7ec", border: "1px solid #bfe3c6", color: "#1d6b2c", borderRadius: 8, padding: 12, fontSize: 14, margin: "16px 0" }}>
              Mot de passe reinitialise avec succes !
            </div>
            <Link
              href="/login"
              style={{ display: "block", background: "#241712", color: "#fff", textAlign: "center", fontWeight: 700, fontSize: 15, padding: 14, borderRadius: 8, textDecoration: "none" }}
            >
              Se connecter
            </Link>
          </>
        ) : !valid ? (
          <>
            <div style={{ background: "#fdecea", border: "1px solid #f5c6c0", color: "#a1261c", borderRadius: 8, padding: 12, fontSize: 14, margin: "16px 0" }}>
              Ce lien est invalide ou a expire.
            </div>
            <Link href="/forgot-password" style={{ color: "#8a6d3b", fontSize: 14, textDecoration: "underline" }}>
              Demander un nouveau lien
            </Link>
          </>
        ) : (
          <>
            <p style={{ color: "#6b5d52", fontSize: 14, lineHeight: 1.6, margin: "0 0 24px" }}>
              Choisissez un nouveau mot de passe (8 caracteres min., au moins une lettre et un chiffre).
            </p>
            {error && (
              <div style={{ background: "#fdecea", border: "1px solid #f5c6c0", color: "#a1261c", borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 16 }}>
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <label style={{ display: "block", fontSize: 14, color: "#241712", fontWeight: 600, marginBottom: 6 }}>
                Nouveau mot de passe
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={input}
              />
              <label style={{ display: "block", fontSize: 14, color: "#241712", fontWeight: 600, marginBottom: 6 }}>
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={input}
              />
              <button type="submit" disabled={submitting} style={button}>
                {submitting ? "Enregistrement..." : "Reinitialiser le mot de passe"}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
