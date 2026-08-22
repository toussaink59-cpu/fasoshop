"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import KimoxaLogo from "@/app/components/KimoxaLogo";
import {
  LockIcon, ShieldCheckIcon, CheckCircleIcon, XCircleIcon,
  EyeIcon, EyeOffIcon, ChevronRightIcon, ChevronLeftIcon,
  ClockIcon, ShieldXIcon,
} from "@/app/components/Icons";

function getPasswordStrength(pwd) {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return Math.min(score, 4);
}

const STRENGTH_LABELS = ["", "Faible", "Moyen", "Bon", "Excellent"];
const STRENGTH_COLORS = ["", "#dc2626", "#f59e0b", "#16a34a", "#059669"];

export default function ResetPasswordClient() {
  const [token, setToken] = useState(null);
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const pwdStrength = getPasswordStrength(password);
  const pwdMatch = password && confirmPassword && password === confirmPassword;
  const pwdMismatch = confirmPassword && password !== confirmPassword;

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
      setError("Erreur réseau. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="shell">
      <div className="register-layout">
        <div className="register-form-col">
          <div style={{ marginBottom: 24 }}>
            <KimoxaLogo size={42} withTagline />
          </div>
          <h1 style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <LockIcon size={24} style={{ color: "var(--gold-600)" }} />
            Nouveau mot de passe
          </h1>

          {checking ? (
            <p style={{ color: "var(--ink-500)", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <ClockIcon size={16} /> Vérification du lien...
            </p>
          ) : success ? (
            <>
              <div style={{ background: "#eaf7ec", border: "1px solid #bfe3c6", color: "#1d6b2c", borderRadius: 8, padding: 12, fontSize: 14, margin: "16px 0", display: "flex", alignItems: "flex-start", gap: 8 }}>
                <CheckCircleIcon size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>Mot de passe réinitialisé avec succès !</span>
              </div>
              <Link
                href="/login"
                className="btn btn-primary"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%" }}
              >
                Se connecter <ChevronRightIcon size={16} />
              </Link>
            </>
          ) : !valid ? (
            <>
              <div style={{ background: "#fdecea", border: "1px solid #f5c6c0", color: "#a1261c", borderRadius: 8, padding: 12, fontSize: 14, margin: "16px 0", display: "flex", alignItems: "flex-start", gap: 8 }}>
                <ShieldXIcon size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>Ce lien est invalide ou a expiré.</span>
              </div>
              <Link href="/forgot-password" style={{ color: "var(--gold-700)", fontSize: 14, textDecoration: "underline" }}>
                Demander un nouveau lien
              </Link>
            </>
          ) : (
            <>
              <p className="register-subtitle">
                Choisissez un nouveau mot de passe (8 caractères min., au moins une lettre et un chiffre).
              </p>

              {error && (
                <div style={{ background: "#fdecea", border: "1px solid #f5c6c0", color: "#a1261c", borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <XCircleIcon size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="register-section">
                  <div className="form-row">
                    <div>
                      <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <LockIcon size={14} /> Nouveau mot de passe
                      </label>
                      <div style={{ position: "relative" }}>
                        <input
                          type={showPwd ? "text" : "password"}
                          required
                          minLength={8}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          style={{ paddingRight: 44 }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPwd(!showPwd)}
                          aria-label={showPwd ? "Masquer" : "Afficher"}
                          style={{
                            position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                            background: "transparent", border: "none", cursor: "pointer",
                            color: "var(--ink-400)", padding: 4, display: "inline-flex",
                          }}
                        >
                          {showPwd ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                        </button>
                      </div>
                      {password && (
                        <div className="pwd-strength" style={{ marginTop: 8 }}>
                          <div className="pwd-strength-bars">
                            {[1, 2, 3, 4].map((i) => (
                              <div key={i} className="pwd-strength-bar" style={{ background: i <= pwdStrength ? STRENGTH_COLORS[pwdStrength] : "#e5e7eb" }} />
                            ))}
                          </div>
                          <span className="pwd-strength-label" style={{ color: STRENGTH_COLORS[pwdStrength] }}>
                            {STRENGTH_LABELS[pwdStrength]}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <label>Confirmer le mot de passe</label>
                      <input
                        type={showPwd ? "text" : "password"}
                        required
                        minLength={8}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        style={{ borderColor: pwdMismatch ? "#dc2626" : pwdMatch ? "#16a34a" : undefined }}
                      />
                      {pwdMatch && <small style={{ color: "#16a34a", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: 4 }}><CheckCircleIcon size={12} /> Identiques</small>}
                      {pwdMismatch && <small style={{ color: "#dc2626", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: 4 }}><XCircleIcon size={12} /> Différents</small>}
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !pwdMatch}
                  className="btn btn-primary register-submit"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  {submitting ? "Enregistrement..." : (
                    <>Réinitialiser le mot de passe <ChevronRightIcon size={16} /></>
                  )}
                </button>
              </form>
            </>
          )}

          <p style={{ textAlign: "center", marginTop: 20, fontSize: "0.95rem" }}>
            <Link href="/login" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--gold-700)" }}>
              <ChevronLeftIcon size={14} /> Retour à la connexion
            </Link>
          </p>
        </div>

        <aside className="register-trust-col">
          <div className="trust-card">
            <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ShieldCheckIcon size={20} style={{ color: "var(--gold-600)" }} /> Nouveau mot de passe
            </h2>
            <ul className="trust-list">
              <li>
                <span className="trust-icon" style={{ color: "var(--gold-600)" }}><LockIcon size={20} /></span>
                <div>
                  <strong>Chiffrement bcrypt</strong>
                  <span>Votre mot de passe est hashé avant stockage</span>
                </div>
              </li>
              <li>
                <span className="trust-icon" style={{ color: "var(--gold-600)" }}><ShieldCheckIcon size={20} /></span>
                <div>
                  <strong>Politique stricte</strong>
                  <span>8+ caractères, lettres + chiffres + symboles</span>
                </div>
              </li>
              <li>
                <span className="trust-icon" style={{ color: "var(--gold-600)" }}><ClockIcon size={20} /></span>
                <div>
                  <strong>Session sécurisée</strong>
                  <span>Connexion automatique après réinitialisation</span>
                </div>
              </li>
            </ul>
            <div className="trust-security" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <LockIcon size={14} />
              <span>Vos données sont protégées</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
