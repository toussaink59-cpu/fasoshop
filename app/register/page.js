"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [role, setRole] = useState("buyer");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [shopName, setShopName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (searchParams.get("role") === "vendor") {
      setRole("vendor");
    }
  }, [searchParams]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setSubmitting(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        fullName,
        phone: phone || undefined,
        role,
        shopName: role === "vendor" ? shopName : undefined,
      }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error || "Erreur lors de l'inscription.");
      return;
    }

    router.push(role === "vendor" ? "/vendor/dashboard" : "/");
  }

  return (
    <div className="shell">
      <div className="content" style={{ maxWidth: 480, margin: "0 auto" }}>
        <div className="page-header">
          <h1>🛒 FasoShop</h1>
          <p>Créer un compte</p>
        </div>

        <div className="panel">
          {error && <div className="error-box">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="account-type-choice" role="radiogroup" aria-label="Type de compte">
              <button
                type="button"
                className={`account-type-card ${role === "buyer" ? "is-selected" : ""}`}
                onClick={() => setRole("buyer")}
                role="radio"
                aria-checked={role === "buyer"}
              >
                <strong>🛍️ Acheteur</strong>
                <span>Achetez des produits en toute simplicité.</span>
              </button>
              <button
                type="button"
                className={`account-type-card ${role === "vendor" ? "is-selected" : ""}`}
                onClick={() => setRole("vendor")}
                role="radio"
                aria-checked={role === "vendor"}
              >
                <strong>🏪 Vendeur</strong>
                <span>Ouvrez votre boutique et vendez après validation de votre identité.</span>
              </button>
            </div>

            <div className="form-row">
              <div>
                <label htmlFor="r-name">Nom complet</label>
                <input
                  id="r-name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex : Aïcha Ouédraogo"
                />
              </div>
            </div>

            <div className="form-row">
              <div>
                <label htmlFor="r-email">Email</label>
                <input
                  id="r-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                />
              </div>
              <div>
                <label htmlFor="r-phone">Téléphone (optionnel)</label>
                <input
                  id="r-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="70 00 00 00"
                />
              </div>
            </div>

            <div className="form-row">
              <div>
                <label htmlFor="r-password">Mot de passe</label>
                <input
                  id="r-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6 caractères minimum"
                />
              </div>
              <div>
                <label htmlFor="r-password-confirm">Confirmer le mot de passe</label>
                <input
                  id="r-password-confirm"
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Retapez le mot de passe"
                />
              </div>
            </div>

            {role === "vendor" && (
              <>
                <p style={{ fontSize: "0.85rem", color: "var(--ink-400)", marginTop: 4, marginBottom: 12 }}>
                  Une fois votre compte créé, une dernière étape vous permettra de vérifier votre
                  identité pour activer votre boutique — pas besoin de le faire maintenant.
                </p>
                <div className="form-row">
                  <div>
                    <label htmlFor="r-shop-name">Nom de la boutique</label>
                    <input
                      id="r-shop-name"
                      required
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      placeholder="Ex : Boutique Aïcha Mode"
                    />
                  </div>
                </div>
              </>
            )}

            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ width: "100%", marginTop: 8 }}>
              {submitting ? "Création en cours..." : "Créer mon compte"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", fontSize: "0.9rem" }}>
          Déjà un compte ? <Link href="/login">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="shell"><div className="content"><p>Chargement...</p></div></div>}>
      <RegisterForm />
    </Suspense>
  );
}
