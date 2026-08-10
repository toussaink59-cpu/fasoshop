"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import KimoxaLogo from "@/app/components/KimoxaLogo";

// Page de connexion UNIQUE.
// « Inscrivez-vous » est maintenant un VRAI lien vers /register
// (le formulaire complet avec prénom/nom, téléphone, pays, CGU).
// L'ancien mini-formulaire intégré (Nom complet seul) est SUPPRIMÉ :
// il créait des comptes incomplets, sans vérification.
export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

      if (userRole === "admin") {
        router.push("/admin/dashboard");
      } else if (userRole === "vendor") {
        router.push("/vendor/dashboard");
      } else {
        router.push("/");
      }
    } catch (err) {
      setError("Impossible de contacter le serveur.");
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>
          <KimoxaLogo size={42} withTagline />
        </h1>
        <p className="subtitle">Connectez-vous à votre compte</p>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="vous@exemple.com"
          />
          <br />
          <br />
          <label htmlFor="password">Mot de passe</label>
          <input
            id="password"
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="••••••••"
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Un instant..." : "Se connecter"}
          </button>
        </form>

        <p className="auth-switch">
          Pas encore de compte ?{" "}
          <Link href="/register">Inscrivez-vous</Link>
        </p>
      </div>
    </div>
  );
}
