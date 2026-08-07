"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import KimoxaLogo from "@/app/components/KimoxaLogo";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [role, setRole] = useState("buyer");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [shopName, setShopName] = useState("");
  const [mainCategoryId, setMainCategoryId] = useState("");
  const [city, setCity] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [nationality, setNationality] = useState("");
  const [countryOfResidence, setCountryOfResidence] = useState("");
  const [verificationAcknowledged, setVerificationAcknowledged] = useState(false);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (searchParams.get("role") === "vendor") {
      setRole("vendor");
    }
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []))
      .catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    if (role === "vendor" && !verificationAcknowledged) {
      setError("Merci de confirmer que vous avez compris que votre compte sera vérifié.");
      return;
    }

    setSubmitting(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        password,
        phone,
        role,
        shopName: role === "vendor" ? shopName : undefined,
        mainCategoryId: role === "vendor" && mainCategoryId ? Number(mainCategoryId) : undefined,
        city: role === "vendor" ? city : undefined,
        dateOfBirth: role === "vendor" ? dateOfBirth : undefined,
        nationality: role === "vendor" ? nationality : undefined,
        countryOfResidence: role === "vendor" ? countryOfResidence : undefined,
        verificationAcknowledged: role === "vendor" ? verificationAcknowledged : undefined,
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
        <div className="page-header" style={{ textAlign: "center" }}>
          <h1><KimoxaLogo size={48} withTagline /></h1>
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
                <label htmlFor="r-firstname">Prénom</label>
                <input
                  id="r-firstname"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ex : Aïcha"
                />
              </div>
              <div>
                <label htmlFor="r-lastname">Nom</label>
                <input
                  id="r-lastname"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Ex : Ouédraogo"
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
                <label htmlFor="r-phone">Téléphone</label>
                <input
                  id="r-phone"
                  required
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
                  identité pour activer votre boutique — pas besoin d'ajouter de photo maintenant.
                </p>

                <div className="form-row">
                  <div>
                    <label htmlFor="r-dob">Date de naissance</label>
                    <input
                      id="r-dob"
                      type="date"
                      required
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="r-nationality">Nationalité</label>
                    <input
                      id="r-nationality"
                      required
                      value={nationality}
                      onChange={(e) => setNationality(e.target.value)}
                      placeholder="Ex : Burkinabè"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div>
                    <label htmlFor="r-country">Pays de résidence</label>
                    <input
                      id="r-country"
                      required
                      value={countryOfResidence}
                      onChange={(e) => setCountryOfResidence(e.target.value)}
                      placeholder="Ex : Burkina Faso"
                    />
                  </div>
                </div>

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
                  <div>
                    <label htmlFor="r-shop-category">Catégorie principale</label>
                    <select
                      id="r-shop-category"
                      value={mainCategoryId}
                      onChange={(e) => setMainCategoryId(e.target.value)}
                    >
                      <option value="">Sélectionner...</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div>
                    <label htmlFor="r-shop-city">Ville de la boutique</label>
                    <input
                      id="r-shop-city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Ex : Ouagadougou"
                    />
                  </div>
                </div>

                <label className="checkbox-row" htmlFor="r-verification-ack">
                  <input
                    id="r-verification-ack"
                    type="checkbox"
                    checked={verificationAcknowledged}
                    onChange={(e) => setVerificationAcknowledged(e.target.checked)}
                  />
                  <span>
                    Je comprends que mon compte sera vérifié avant l'ouverture de ma boutique.
                  </span>
                </label>
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
