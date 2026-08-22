"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import KimoxaLogo from "@/app/components/KimoxaLogo";
import {
  LockIcon, ShieldCheckIcon, BadgeCheckIcon, RotateCcwIcon,
  ChevronRightIcon, UserIcon, EyeIcon, EyeOffIcon,
} from "@/app/components/Icons";

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
        setError(data.error || "Une erreur est survenue.");
        setLoading(false);
        return;
      }

      const meRes = await fetch("/api/auth/me");
      const me = await meRes.json();
      const userRole = me.user?.role;

      if (userRole === "admin") router.push("/admin/dashboard");
      else if (userRole === "vendor") router.push("/vendor/dashboard");
      else router.push("/");
    } catch (err) {
      setError("Impossible de contacter le serveur.");
      setLoading(false);
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
            <UserIcon size={24} style={{ color: "var(--gold-600)" }} />
            Connexion
          </h1>
          <p className="register-subtitle">Accédez à votre compte Kimoxa</p>

          {error && <div className="error-box">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="register-section">
              <div style={{ marginBottom: 16 }}>
                <label htmlFor="email" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <UserIcon size={14} /> Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="vous@exemple.com"
                  autoComplete="email"
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label htmlFor="password" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <LockIcon size={14} /> Mot de passe
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="password"
                    type={showPwd ? "text" : "password"}
                    required
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="Votre mot de passe"
                    autoComplete="current-password"
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
              </div>

              <div style={{ textAlign: "right", marginBottom: 16 }}>
                <Link href="/forgot-password" style={{ color: "var(--gold-700)", fontSize: "0.9rem" }}>
                  Mot de passe oublié ?
                </Link>
              </div>
            </div>

            <button type="submit" className="btn btn-primary register-submit" disabled={loading}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {loading ? "Connexion en cours..." : (
                <>Se connecter <ChevronRightIcon size={16} /></>
              )}
            </button>
          </form>

          <p className="auth-switch" style={{ textAlign: "center", marginTop: 20, fontSize: "0.95rem" }}>
            Pas encore de compte ?{" "}
            <Link href="/register" style={{ fontWeight: 600, color: "var(--gold-700)" }}>Inscrivez-vous</Link>
          </p>
        </div>

        <aside className="register-trust-col">
          <div className="trust-card">
            <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ShieldCheckIcon size={20} style={{ color: "var(--gold-600)" }} /> Connexion sécurisée
            </h2>
            <ul className="trust-list">
              <li>
                <span className="trust-icon" style={{ color: "var(--gold-600)" }}><LockIcon size={20} /></span>
                <div>
                  <strong>Chiffrement SSL</strong>
                  <span>Vos données sont protégées en transit</span>
                </div>
              </li>
              <li>
                <span className="trust-icon" style={{ color: "var(--gold-600)" }}><BadgeCheckIcon size={20} /></span>
                <div>
                  <strong>Session sécurisée</strong>
                  <span>Cookie chiffré, expiration automatique</span>
                </div>
              </li>
              <li>
                <span className="trust-icon" style={{ color: "var(--gold-600)" }}><RotateCcwIcon size={20} /></span>
                <div>
                  <strong>Récupération facile</strong>
                  <span>Réinitialisez votre mot de passe en 1 clic</span>
                </div>
              </li>
            </ul>
            <div className="trust-security" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <LockIcon size={14} />
              <span>Connexion sécurisée SSL · Données protégées</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
