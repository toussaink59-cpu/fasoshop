"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState("login"); // 'login' | 'register'
  const [role, setRole] = useState("vendor");
  const [form, setForm] = useState({ email: "", password: "", fullName: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const url = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload =
        mode === "login"
          ? { email: form.email, password: form.password }
          : { ...form, role };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Une erreur est survenue.");
        setLoading(false);
        return;
      }

      // Récupère le rôle réel pour rediriger au bon endroit
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
        <h1>🛒 FasoShop</h1>
        <p className="subtitle">
          {mode === "login" ? "Connectez-vous à votre compte" : "Créez votre compte"}
        </p>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleSubmit}>
          {mode === "register" && (
            <>
              <div className="role-pick">
                <button
                  type="button"
                  className={role === "buyer" ? "active" : ""}
                  onClick={() => setRole("buyer")}
                >
                  Acheteur
                </button>
                <button
                  type="button"
                  className={role === "vendor" ? "active" : ""}
                  onClick={() => setRole("vendor")}
                >
                  Vendeur
                </button>
              </div>
              <label htmlFor="fullName">Nom complet</label>
              <input
                id="fullName"
                required
                value={form.fullName}
                onChange={(e) => update("fullName", e.target.value)}
                placeholder="Ex : Awa Traoré"
              />
              <br />
              <br />
            </>
          )}

          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="vous@exemple.com"
          />
          <br />
          <br />

          <label htmlFor="password">Mot de passe</label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            placeholder="••••••••"
          />

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Un instant..." : mode === "login" ? "Se connecter" : "Créer mon compte"}
          </button>
        </form>

        <p className="auth-switch">
          {mode === "login" ? (
            <>
              Pas encore de compte ?{" "}
              <a onClick={() => { setMode("register"); setError(""); }}>Inscrivez-vous</a>
            </>
          ) : (
            <>
              Déjà inscrit ?{" "}
              <a onClick={() => { setMode("login"); setError(""); }}>Connectez-vous</a>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
