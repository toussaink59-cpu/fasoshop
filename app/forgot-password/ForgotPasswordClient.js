"use client";

import { useState } from "react";
import Link from "next/link";
import KimoxaLogo from "@/app/components/KimoxaLogo";
import { LockIcon, ChevronLeftIcon, MailIcon, CheckCircleIcon } from "@/app/components/Icons";

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
        setMessage(data.message || "Si cet email est associé à un compte, un lien de réinitialisation a été envoyé.");
      } else {
        setError(data.error || "Une erreur est survenue. Réessayez.");
      }
    } catch {
      setError("Erreur réseau. Vérifiez votre connexion.");
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
        width: "100%", maxWidth: 420,
        background: "#18181b", borderRadius: 16,
        padding: "40px 36px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <KimoxaLogo size={42} light />
        </div>

        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "rgba(201,169,97,0.15)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px",
        }}>
          <LockIcon size={26} style={{ color: "#c9a961" }} />
        </div>

        <h1 style={{
          margin: "0 0 8px", fontSize: "1.6rem", fontWeight: 700,
          color: "#fff", textAlign: "center", letterSpacing: "-0.02em",
        }}>
          Mot de passe oublié ?
        </h1>
        <p style={{
          margin: "0 0 28px", textAlign: "center",
          color: "#a1a1aa", fontSize: "0.9rem", lineHeight: 1.5,
        }}>
          Entrez votre email, nous vous enverrons un lien pour créer un nouveau mot de passe.
        </p>

        {message && (
          <div style={{
            padding: "12px 14px", borderRadius: 10, marginBottom: 20,
            background: "rgba(22,163,74,0.1)",
            border: "1px solid rgba(22,163,74,0.3)",
            color: "#86efac", fontSize: "0.87rem",
            display: "flex", alignItems: "flex-start", gap: 10,
          }}>
            <CheckCircleIcon size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div style={{
            padding: "12px 14px", borderRadius: 10, marginBottom: 20,
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "#fca5a5", fontSize: "0.87rem",
          }}>
            {error}
          </div>
        )}

        {!message ? (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label htmlFor="fp-email" style={labelStyle}>Adresse email</label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                  color: "#52525b", display: "flex",
                }}>
                  <MailIcon size={16} />
                </span>
                <input
                  id="fp-email" type="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  style={{ ...inputStyle, paddingLeft: 40 }}
                />
              </div>
            </div>

            <button
              type="submit" disabled={submitting}
              style={{
                width: "100%", padding: "13px 16px",
                background: "linear-gradient(135deg, #c9a961 0%, #a88941 100%)",
                color: "#0a0a0a", border: "none", borderRadius: 10,
                fontSize: "0.95rem", fontWeight: 700,
                cursor: submitting ? "not-allowed" : "pointer",
                letterSpacing: "0.01em",
                boxShadow: "0 4px 14px rgba(201,169,97,0.3)",
              }}
            >
              {submitting ? "Envoi en cours..." : "Recevoir le lien"}
            </button>
          </form>
        ) : (
          <div style={{
            padding: "16px 18px", borderRadius: 10,
            background: "#09090b", border: "1px solid #27272a",
            fontSize: "0.82rem", color: "#a1a1aa", lineHeight: 1.6,
          }}>
            <strong style={{ color: "#fff", display: "block", marginBottom: 6 }}>À vérifier :</strong>
            • Dossier <strong style={{ color: "#fff" }}>Spam / Courrier indésirable</strong><br/>
            • Le lien expire après <strong style={{ color: "#fff" }}>60 minutes</strong><br/>
            • Usage <strong style={{ color: "#fff" }}>unique</strong> (invalidé après utilisation)
          </div>
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
          <LockIcon size={11} /> Lien sécurisé par token 256 bits
        </p>
      </div>
    </div>
  );
}
