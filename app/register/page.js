"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import KimoxaLogo from "@/app/components/KimoxaLogo";
import { COUNTRIES } from "@/lib/countries";

// Jauge de force du mot de passe (0 à 4)
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

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [role, setRole] = useState("buyer");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+226 ");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [nationalityCode, setNationalityCode] = useState("BF");
  const [countryOfResidenceCode, setCountryOfResidenceCode] = useState("BF");
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Champs vendeur uniquement
  const [shopName, setShopName] = useState("");
  const [mainCategoryId, setMainCategoryId] = useState("");
  const [city, setCity] = useState("");
  const [verificationAcknowledged, setVerificationAcknowledged] = useState(false);

  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const pwdStrength = getPasswordStrength(password);
  const pwdMatch = password && confirmPassword && password === confirmPassword;
  const pwdMismatch = confirmPassword && password !== confirmPassword;

  // Date max = aujourd'hui - 15 ans
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 15);
  const maxDateStr = maxDate.toISOString().split("T")[0];

  useEffect(() => {
    if (searchParams.get("role") === "vendor") setRole("vendor");
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

    if (!agreeTerms) {
      setError("Vous devez accepter les conditions d'utilisation.");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    if (role === "vendor" && !verificationAcknowledged) {
      setError("Merci de confirmer que vous avez compris la vérification de votre compte.");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName, lastName, email, password, confirmPassword, phone, role,
        dateOfBirth, nationalityCode, countryOfResidenceCode, agreeTerms,
        shopName: role === "vendor" ? shopName : undefined,
        mainCategoryId: role === "vendor" && mainCategoryId ? Number(mainCategoryId) : undefined,
        city: role === "vendor" ? city : undefined,
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
      <div className="register-layout">

        {/* ====== COLONNE GAUCHE : FORMULAIRE ====== */}
        <div className="register-form-col">
          <div className="register-brand">
            <KimoxaLogo size={44} withTagline />
          </div>
          <h1>Créer mon compte</h1>
          <p className="register-subtitle">Rejoignez la marketplace de confiance de l'Afrique</p>

          {error && <div className="error-box">{error}</div>}

          <form onSubmit={handleSubmit}>
            {/* Choix du rôle */}
            <div className="account-type-choice" role="radiogroup">
              <button
                type="button"
                className={`account-type-card ${role === "buyer" ? "is-selected" : ""}`}
                onClick={() => setRole("buyer")}
              >
                <strong>🛍️ Je veux acheter</strong>
                <span>Compte gratuit, accès immédiat</span>
              </button>
              <button
                type="button"
                className={`account-type-card ${role === "vendor" ? "is-selected" : ""}`}
                onClick={() => setRole("vendor")}
              >
                <strong>🏪 Je veux vendre</strong>
                <span>Ouvrir ma boutique (vérification requise)</span>
              </button>
            </div>

            {/* Identité */}
            <div className="register-section">
              <h2 className="register-section-title">👤 Mon identité</h2>
              <div className="form-row">
                <div>
                  <label htmlFor="r-firstname">Prénom *</label>
                  <input id="r-firstname" required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ex : Aïcha" />
                </div>
                <div>
                  <label htmlFor="r-lastname">Nom *</label>
                  <input id="r-lastname" required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Ex : Ouédraogo" />
                </div>
              </div>

              <div className="form-row">
                <div>
                  <label htmlFor="r-email">Email *</label>
                  <input id="r-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" />
                </div>
                <div>
                  <label htmlFor="r-phone">Téléphone *</label>
                  <input id="r-phone" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+226 70 00 00 00" />
                </div>
              </div>

              <div className="form-row">
                <div>
                  <label htmlFor="r-dob">Date de naissance *</label>
                  <input id="r-dob" type="date" required max={maxDateStr} value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
                  <small style={{ color: "var(--ink-400)", fontSize: "0.72rem" }}>Vous devez avoir au moins 15 ans</small>
                </div>
              </div>

              <div className="form-row">
                <div>
                  <label htmlFor="r-nationality">Nationalité *</label>
                  <select id="r-nationality" required value={nationalityCode} onChange={(e) => setNationalityCode(e.target.value)}>
                    {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="r-country">Pays de résidence *</label>
                  <select id="r-country" required value={countryOfResidenceCode} onChange={(e) => setCountryOfResidenceCode(e.target.value)}>
                    {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Sécurité */}
            <div className="register-section">
              <h2 className="register-section-title">🔐 Sécurité</h2>
              <div className="form-row">
                <div>
                  <label htmlFor="r-password">Mot de passe *</label>
                  <input
                    id="r-password"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="8 caractères minimum"
                  />
                  {password && (
                    <div className="pwd-strength">
                      <div className="pwd-strength-bars">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className="pwd-strength-bar"
                            style={{
                              background: i <= pwdStrength ? STRENGTH_COLORS[pwdStrength] : "#e5e7eb",
                            }}
                          />
                        ))}
                      </div>
                      <span className="pwd-strength-label" style={{ color: STRENGTH_COLORS[pwdStrength] }}>
                        {STRENGTH_LABELS[pwdStrength]}
                      </span>
                    </div>
                  )}
                  <small style={{ color: "var(--ink-400)", fontSize: "0.72rem", display: "block", marginTop: 4 }}>
                    Minimum 8 caractères · majuscules + chiffres + symboles recommandés
                  </small>
                </div>
                <div>
                  <label htmlFor="r-password-confirm">Confirmer *</label>
                  <input
                    id="r-password-confirm"
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Retapez le mot de passe"
                    style={{ borderColor: pwdMismatch ? "#dc2626" : pwdMatch ? "#16a34a" : undefined }}
                  />
                  {pwdMatch && <small style={{ color: "#16a34a", fontSize: "0.75rem" }}>✓ Les mots de passe correspondent</small>}
                  {pwdMismatch && <small style={{ color: "#dc2626", fontSize: "0.75rem" }}>✗ Les mots de passe ne correspondent pas</small>}
                </div>
              </div>
            </div>

            {/* Champs vendeur */}
            {role === "vendor" && (
              <div className="register-section">
                <h2 className="register-section-title">🏪 Ma boutique</h2>
                <p style={{ fontSize: "0.82rem", color: "var(--ink-400)", marginBottom: 10 }}>
                  Après inscription, une vérification d'identité (CNI / passeport) sera requise pour activer votre boutique.
                </p>
                <div className="form-row">
                  <div>
                    <label htmlFor="r-shop-name">Nom de la boutique *</label>
                    <input id="r-shop-name" required value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="Ex : Boutique Aïcha Mode" />
                  </div>
                  <div>
                    <label htmlFor="r-shop-category">Catégorie principale</label>
                    <select id="r-shop-category" value={mainCategoryId} onChange={(e) => setMainCategoryId(e.target.value)}>
                      <option value="">Sélectionner...</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div>
                    <label htmlFor="r-shop-city">Ville de la boutique</label>
                    <input id="r-shop-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex : Ouagadougou" />
                  </div>
                </div>
                <label className="checkbox-row" htmlFor="r-verification-ack">
                  <input id="r-verification-ack" type="checkbox" checked={verificationAcknowledged} onChange={(e) => setVerificationAcknowledged(e.target.checked)} />
                  <span>Je comprends que mon compte sera vérifié avant l'ouverture de ma boutique.</span>
                </label>
              </div>
            )}

            {/* CGU */}
            <label className="checkbox-row" htmlFor="r-agree-terms" style={{ marginTop: 12 }}>
              <input id="r-agree-terms" type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} required />
              <span>
                J'accepte les <Link href="/cgu" target="_blank">CGU</Link> et les <Link href="/cgv" target="_blank">CGV</Link> de Kimoxa *
              </span>
            </label>

            <button type="submit" className="btn btn-primary register-submit" disabled={submitting}>
              {submitting ? "Création en cours..." : "Créer mon compte sécurisé →"}
            </button>

            <p className="register-footer-link">
              Déjà un compte ? <Link href="/login">Se connecter</Link>
            </p>
          </form>
        </div>

        {/* ====== COLONNE DROITE : PANNEAU CONFIANCE ====== */}
        <aside className="register-trust-col">
          <div className="trust-card">
            <h2>🛡️ Pourquoi Kimoxa ?</h2>
            <ul className="trust-list">
              <li>
                <span className="trust-icon">🔒</span>
                <div>
                  <strong>Paiement séquestré</strong>
                  <span>L'argent est libéré uniquement à la livraison</span>
                </div>
              </li>
              <li>
                <span className="trust-icon">🪪</span>
                <div>
                  <strong>Vendeurs vérifiés</strong>
                  <span>Chaque vendeur est contrôlé par pièce d'identité</span>
                </div>
              </li>
              <li>
                <span className="trust-icon">↩️</span>
                <div>
                  <strong>Retours 7 jours</strong>
                  <span>Satisfait ou remboursé sous 7 jours</span>
                </div>
              </li>
              <li>
                <span className="trust-icon">💬</span>
                <div>
                  <strong>Support 7j/7</strong>
                  <span>Notre équipe vous répond à tout moment</span>
                </div>
              </li>
              <li>
                <span className="trust-icon">📱</span>
                <div>
                  <strong>Mobile Money</strong>
                  <span>Orange, Moov, Wave, MTN acceptés</span>
                </div>
              </li>
            </ul>

            <div className="trust-testimonial">
              <p>« J'ai commandé un téléphone, reçu en 48h. Vendeur sérieux, prix correct. Je recommande Kimoxa ! »</p>
              <div className="trust-testimonial-author">
                ⭐⭐⭐⭐⭐ — Awa K., Ouagadougou
              </div>
            </div>

            <div className="trust-stats">
              <div className="trust-stat">
                <strong>1 200+</strong>
                <span>Membres actifs</span>
              </div>
              <div className="trust-stat">
                <strong>98%</strong>
                <span>Satisfaction</span>
              </div>
              <div className="trust-stat">
                <strong>🇧🇫</strong>
                <span>Conçu au Burkina</span>
              </div>
            </div>

            <div className="trust-security">
              <span>🔒</span>
              <span>Inscription sécurisée · SSL · Données protégées</span>
            </div>
          </div>
        </aside>
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
