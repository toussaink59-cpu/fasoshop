"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import KimoxaLogo from "@/app/components/KimoxaLogo";
import { LockIcon, CheckCircleIcon, XCircleIcon, EyeIcon, EyeOffIcon, ChevronRightIcon, ChevronLeftIcon, ClockIcon, ShieldXIcon } from "@/app/components/Icons";

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
    if (!t) { setValid(false); setChecking(false); return; }
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
      if (res.ok) setSuccess(true);
      else setError(data.error || "Une erreur est survenue.");
    } catch {
      setError("Erreur réseau. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = {
    width: "100%", padding: "12px 14px",
    background: "#09090b", border: "1px solid #27272a",
    borderRadius: 10, color: "#fff", fontSize: "0.95rem",
    outline: "none", boxSizing: "border-box",
  };
  const labelStyle = { display: "block", marginBottom: 6, fontSize: "0.82rem", fontWeight: 600, color: "#a1a1aa" };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a0a0a 0%, #1a1410 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px 16px",
    }}>
      <div style={{
        width: "100%", maxWidth: 440,
        background: "#18181b", borderRadius: 16,
        padding: "40px 36px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <KimoxaLogo size={42} light />
        </div>

        {checking ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{
              width: 48, height: 48, margin: "0 auto 16px",
              border: "3px solid #27272a", borderTopColor: "#c9a961",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ color: "#a1a1aa", fontSize: "0.9rem", margin: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <ClockIcon size={16} /> Vérification du lien...
            </p>
          </div>
        ) : success ? (
          <>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "rgba(22,163,74,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
            }}>
              <CheckCircleIcon size={32} style={{ color: "#16a34a" }} />
            </div>
            <h1 style={{ margin: "0 0 8px", fontSize: "1.5rem", fontWeight: 700, color: "#fff", textAlign: "center" }}>
              Mot de passe réinitialisé
            </h1>
            <p style={{ margin: "0 0 24px", textAlign: "center", color: "#a1a1aa", fontSize: "0.9rem" }}>
              Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
            </p>
            <Link
              href="/login"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                width: "100%", padding: "13px 16px",
                background: "linear-gradient(135deg, #c9a961 0%, #a88941 100%)",
                color: "#0a0a0a", borderRadius: 10,
                fontSize: "0.95rem", fontWeight: 700, textDecoration: "none",
                boxShadow: "0 4px 14px rgba(201,169,97,0.3)",
              }}
            >
              Se connecter <ChevronRightIcon size={16} />
            </Link>
          </>
        ) : !valid ? (
          <>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "rgba(239,68,68,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
            }}>
              <ShieldXIcon size={32} style={{ color: "#dc2626" }} />
            </div>
            <h1 style={{ margin: "0 0 8px", fontSize: "1.5rem", fontWeight: 700, color: "#fff", textAlign: "center" }}>
              Lien invalide ou expiré
            </h1>
            <p style={{ margin: "0 0 24px", textAlign: "center", color: "#a1a1aa", fontSize: "0.9rem", lineHeight: 1.5 }}>
              Ce lien n'est plus valide. Demandez-en un nouveau pour réinitialiser votre mot de passe.
            </p>
            <Link
              href="/forgot-password"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                width: "100%", padding: "13px 16px",
                background: "linear-gradient(135deg, #c9a961 0%, #a88941 100%)",
                color: "#0a0a0a", borderRadius: 10,
                fontSize: "0.95rem", fontWeight: 700, textDecoration: "none",
                boxShadow: "0 4px 14px rgba(201,169,97,0.3)",
              }}
            >
              Demander un nouveau lien <ChevronRightIcon size={16} />
            </Link>
          </>
        ) : (
          <>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "rgba(201,169,97,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
            }}>
              <LockIcon size={26} style={{ color: "#c9a961" }} />
            </div>
            <h1 style={{ margin: "0 0 8px", fontSize: "1.5rem", fontWeight: 700, color: "#fff", textAlign: "center" }}>
              Nouveau mot de passe
            </h1>
            <p style={{ margin: "0 0 24px", textAlign: "center", color: "#a1a1aa", fontSize: "0.9rem", lineHeight: 1.5 }}>
              Choisissez un mot de passe fort d'au moins 8 caractères.
            </p>

            {error && (
              <div style={{
                padding: "10px 14px", borderRadius: 8, marginBottom: 20,
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#fca5a5", fontSize: "0.87rem",
                display: "flex", alignItems: "flex-start", gap: 10,
              }}>
                <XCircleIcon size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Nouveau mot de passe</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPwd ? "text" : "password"}
                    required minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ ...inputStyle, paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    style={{
                      position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer",
                      color: "#71717a", padding: 4, display: "inline-flex",
                    }}
                  >
                    {showPwd ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                  </button>
                </div>
                {password && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} style={{
                          flex: 1, height: 4, borderRadius: 2,
                          background: i <= pwdStrength ? STRENGTH_COLORS[pwdStrength] : "#27272a",
                        }} />
                      ))}
                    </div>
                    <small style={{ color: STRENGTH_COLORS[pwdStrength], fontSize: "0.75rem", fontWeight: 600 }}>
                      Force : {STRENGTH_LABELS[pwdStrength]}
                    </small>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Confirmer le mot de passe</label>
                <input
                  type="password" required minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ ...inputStyle, borderColor: pwdMismatch ? "#dc2626" : pwdMatch ? "#16a34a" : "#27272a" }}
                />
                {pwdMatch && <small style={{ color: "#16a34a", fontSize: "0.75rem", marginTop: 4, display: "block" }}>✓ Les mots de passe correspondent</small>}
                {pwdMismatch && <small style={{ color: "#dc2626", fontSize: "0.75rem", marginTop: 4, display: "block" }}>✗ Les mots de passe ne correspondent pas</small>}
              </div>

              <button
                type="submit"
                disabled={submitting || !pwdMatch}
                style={{
                  width: "100%", padding: "13px 16px",
                  background: "linear-gradient(135deg, #c9a961 0%, #a88941 100%)",
                  color: "#0a0a0a", border: "none", borderRadius: 10,
                  fontSize: "0.95rem", fontWeight: 700,
                  cursor: (submitting || !pwdMatch) ? "not-allowed" : "pointer",
                  opacity: !pwdMatch ? 0.5 : 1,
                  boxShadow: "0 4px 14px rgba(201,169,97,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                {submitting ? "Enregistrement..." : (<>Réinitialiser <ChevronRightIcon size={16} /></>)}
              </button>
            </form>
          </>
        )}

        <p style={{ textAlign: "center", marginTop: 24, fontSize: "0.9rem" }}>
          <Link href="/login" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            color: "#a1a1aa", textDecoration: "none",
          }}>
            <ChevronLeftIcon size={14} /> Retour à la connexion
          </Link>
        </p>

        <p style={{
          textAlign: "center", marginTop: 20,
          fontSize: "0.75rem", color: "#52525b",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <LockIcon size={11} /> Mot de passe chiffré bcrypt
        </p>
      </div>
    </div>
  );
}
