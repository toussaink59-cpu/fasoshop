"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import KimoxaLogo from "@/app/components/KimoxaLogo";
import { LockIcon, EyeIcon, EyeOffIcon, MailIcon } from "@/app/components/Icons";

function GoogleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Identifiants incorrects.");
        setLoading(false);
        return;
      }
      const meRes = await fetch("/api/auth/me");
      const me = await meRes.json();
      const role = me.user?.role;
      if (role === "admin") router.push("/admin/dashboard");
      else if (role === "vendor") router.push("/vendor/dashboard");
      else router.push("/");
    } catch {
      setError("Impossible de contacter le serveur.");
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a0a0a 0%, #1a1410 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 16px",
    }}>
      <div style={{
        width: "100%",
        maxWidth: 420,
        background: "#18181b",
        borderRadius: 16,
        padding: "40px 36px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 32, color: "#ffffff" }}>
          <KimoxaLogo size={42} withTagline light />
        </div>

        <h1 style={{
          margin: "0 0 8px",
          fontSize: "1.75rem",
          fontWeight: 700,
          color: "#fff",
          textAlign: "center",
          letterSpacing: "-0.02em",
        }}>
          Bon retour
        </h1>
        <p style={{
          margin: "0 0 28px",
          textAlign: "center",
          color: "#a1a1aa",
          fontSize: "0.95rem",
        }}>
          Vos boutiques préférées vous attendent
        </p>

        {error && (
          <div style={{
            padding: "10px 14px",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 8,
            color: "#fca5a5",
            fontSize: "0.87rem",
            marginBottom: 20,
          }}>
            {error}
          </div>
        )}

        <a
          href="/api/auth/google"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            width: "100%",
            padding: "12px 16px",
            background: "#fff",
            color: "#18181b",
            border: "none",
            borderRadius: 10,
            fontSize: "0.95rem",
            fontWeight: 600,
            textDecoration: "none",
            cursor: "pointer",
            transition: "transform 0.1s, box-shadow 0.2s",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
        >
          <GoogleIcon size={20} />
          Continuer avec Google
        </a>

        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          margin: "24px 0",
          color: "#52525b",
          fontSize: "0.8rem",
        }}>
          <div style={{ flex: 1, height: 1, background: "#27272a" }} />
          <span>OU</span>
          <div style={{ flex: 1, height: 1, background: "#27272a" }} />
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="email" style={{
              display: "block",
              marginBottom: 6,
              fontSize: "0.82rem",
              fontWeight: 600,
              color: "#a1a1aa",
            }}>
              Adresse email
            </label>
            <div style={{ position: "relative" }}>
              <span style={{
                position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                color: "#52525b", display: "flex",
              }}>
                <MailIcon size={16} />
              </span>
              <input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="vous@exemple.com"
                autoComplete="email"
                style={{
                  width: "100%",
                  padding: "12px 12px 12px 40px",
                  background: "#09090b",
                  border: "1px solid #27272a",
                  borderRadius: 10,
                  color: "#fff",
                  fontSize: "0.95rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#c9a961"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#27272a"; }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 6,
            }}>
              <label htmlFor="password" style={{
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "#a1a1aa",
              }}>
                Mot de passe
              </label>
            </div>
            <div style={{ position: "relative" }}>
              <span style={{
                position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                color: "#52525b", display: "flex",
              }}>
                <LockIcon size={16} />
              </span>
              <input
                id="password"
                type={showPwd ? "text" : "password"}
                required
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{
                  width: "100%",
                  padding: "12px 44px 12px 40px",
                  background: "#09090b",
                  border: "1px solid #27272a",
                  borderRadius: 10,
                  color: "#fff",
                  fontSize: "0.95rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#c9a961"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#27272a"; }}
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  background: "transparent", border: "none", cursor: "pointer",
                  color: "#71717a", padding: 4, display: "inline-flex",
                }}
              >
                {showPwd ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "13px 16px",
              background: "linear-gradient(135deg, #c9a961 0%, #a88941 100%)",
              color: "#0a0a0a",
              border: "none",
              borderRadius: 10,
              fontSize: "0.95rem",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              marginTop: 8,
              letterSpacing: "0.01em",
              boxShadow: "0 4px 14px rgba(201,169,97,0.3)",
              transition: "transform 0.1s, box-shadow 0.2s",
            }}
            onMouseEnter={(e) => { if(!loading) e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
          >
            {loading ? "Connexion en cours..." : "Se connecter"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Link href="/forgot-password" style={{ color: "#a1a1aa", fontSize: "0.85rem", textDecoration: "none" }}>
            Mot de passe oublié ?
          </Link>
        </div>

        <p style={{
          textAlign: "center",
          marginTop: 24,
          fontSize: "0.9rem",
          color: "#a1a1aa",
        }}>
          Pas encore de compte ?{" "}
          <Link href="/register" style={{
            color: "#c9a961",
            fontWeight: 600,
            textDecoration: "none",
          }}>
            Créer un compte
          </Link>
        </p>

        <p style={{
          textAlign: "center",
          marginTop: 20,
          fontSize: "0.75rem",
          color: "#52525b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}>
          <LockIcon size={11} /> Connexion sécurisée SSL — Données protégées
        </p>
      </div>
    </div>
  );
}
