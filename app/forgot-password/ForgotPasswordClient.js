"use client";

import { useState } from "react";
import Link from "next/link";
import KimoxaLogo from "@/app/components/KimoxaLogo";
import {
  LockIcon, UserIcon, ShieldCheckIcon, ChevronLeftIcon, CheckCircleIcon, MailIcon, ClockIcon, ShieldXIcon, ChevronRightIcon
} from "@/app/components/Icons";

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
            "Si cet email est associé à un compte, un lien de réinitialisation a été envoyé."
        );
      } else {
        setError(data.error || "Une erreur est survenue. Réessayez.");
      }
    } catch {
      setError("Erreur réseau. Vérifiez votre connexion.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="shell">
      <div className="register-layout">
        <div className="register-form-col">
          <div style={{ marginBottom: 24 }}>
            <KimoxaLogo size={42} />
          </div>
          <h1 style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <LockIcon size={24} style={{ color: "var(--gold-600)" }} />
            Mot de passe oublié ?
          </h1>
          <p className="register-subtitle">
            Entrez votre adresse email : nous vous enverrons un lien pour créer un nouveau mot de passe.
          </p>

          {message && (
            <div style={{ background: "#eaf7ec", border: "1px solid #bfe3c6", color: "#1d6b2c", borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 8 }}>
              <CheckCircleIcon size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{message}</span>
            </div>
          )}
          {error && (
            <div style={{ background: "#fdecea", border: "1px solid #f5c6c0", color: "#a1261c", borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 8 }}>
              <ShieldXIcon size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="register-section">
              <div style={{ marginBottom: 16 }}>
                <label htmlFor="fp-email" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <MailIcon size={14} /> Adresse email
                </label>
                <input
                  id="fp-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  autoComplete="email"
                  disabled={!!message}
                />
              </div>
            </div>

            {!message && (
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary register-submit"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                {submitting ? "Envoi en cours..." : (
                  <>Recevoir le lien <ChevronRightIcon size={16} /></>
                )}
              </button>
            )}
          </form>

          <p style={{ textAlign: "center", marginTop: 20, fontSize: "0.95rem" }}>
            <Link href="/login" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--gold-700)" }}>
              <ChevronLeftIcon size={14} /> Retour à la connexion
            </Link>
          </p>
        </div>

        <aside className="register-trust-col">
          <div className="trust-card">
            <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ShieldCheckIcon size={20} style={{ color: "var(--gold-600)" }} /> Sécurité du lien
            </h2>
            <ul className="trust-list">
              <li>
                <span className="trust-icon" style={{ color: "var(--gold-600)" }}><ClockIcon size={20} /></span>
                <div>
                  <strong>Expire en 1 heure</strong>
                  <span>Le lien devient inutilisable après 60 minutes</span>
                </div>
              </li>
              <li>
                <span className="trust-icon" style={{ color: "var(--gold-600)" }}><LockIcon size={20} /></span>
                <div>
                  <strong>Usage unique</strong>
                  <span>Le lien est invalidé après utilisation</span>
                </div>
              </li>
              <li>
                <span className="trust-icon" style={{ color: "var(--gold-600)" }}><ShieldCheckIcon size={20} /></span>
                <div>
                  <strong>Anti-énumération</strong>
                  <span>Impossible de deviner les emails existants</span>
                </div>
              </li>
            </ul>
            <div className="trust-security" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <LockIcon size={14} />
              <span>Processus sécurisé par token 256 bits</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
