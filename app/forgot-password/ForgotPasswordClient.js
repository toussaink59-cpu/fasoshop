"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordClient() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage(
          data.message ||
            "Si cet email est associe a un compte, un lien de reinitialisation a ete envoye."
        );
      } else {
        setError(data.error || "Une erreur est survenue. Reessayez.");
      }
    } catch {
      setError("Erreur reseau. Verifiez votre connexion.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#faf6ef", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 4px 24px rgba(36,23,18,0.08)", maxWidth: 440, width: "100%", padding: 32, boxSizing: "border-box" }}>
        <h1 style={{ color: "#241712", fontSize: 22, margin: "0 0 8px" }}>Mot de passe oublie ?</h1>
        <p style={{ color: "#6b5d52", fontSize: 14, lineHeight: 1.6, margin: "0 0 24px" }}>
          Entrez votre adresse email : nous vous enverrons un lien pour creer un nouveau mot de passe.
        </p>

        {message && (
          <div style={{ background: "#eaf7ec", border: "1px solid #bfe3c6", color: "#1d6b2c", borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 16 }}>
            {message}
          </div>
        )}
        {error && (
          <div style={{ background: "#fdecea", border: "1px solid #f5c6c0", color: "#a1261c", borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", fontSize: 14, color: "#241712", fontWeight: 600, marginBottom: 6 }}>
            Adresse email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@exemple.com"
            style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #d8cfc4", fontSize: 15, marginBottom: 16, boxSizing: "border-box" }}
          />
          <button
            type="submit"
            disabled={submitting}
            style={{ width: "100%", background: submitting ? "#c9a86a" : "#e6a623", color: "#241712", fontWeight: 700, fontSize: 15, padding: 14, border: "none", borderRadius: 8, cursor: submitting ? "default" : "pointer" }}
          >
            {submitting ? "Envoi en cours..." : "Recevoir le lien"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 14 }}>
          <Link href="/login" style={{ color: "#8a6d3b", textDecoration: "underline" }}>
            Retour a la connexion
          </Link>
        </p>
      </div>
    </main>
  );
}
