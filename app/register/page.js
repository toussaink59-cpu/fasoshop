"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import KimoxaLogo from "@/app/components/KimoxaLogo";
import { COUNTRIES } from "@/lib/countries";
import {
  ShoppingCartIcon, StoreIcon, LockIcon, CheckCircleIcon, XCircleIcon,
  ChevronRightIcon, UserIcon, SmartphoneIcon, CalendarIcon,
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

  const [shopName, setShopName] = useState("");
  const [mainCategoryId, setMainCategoryId] = useState("");
  const [city, setCity] = useState("");

  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const pwdStrength = getPasswordStrength(password);
  const pwdMatch = password && confirmPassword && password === confirmPassword;
  const pwdMismatch = confirmPassword && password !== confirmPassword;

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

    if (!agreeTerms) { setError("Vous devez accepter les conditions d'utilisation."); return; }
    if (password.length < 8) { setError("Le mot de passe doit contenir au moins 8 caractères."); return; }
    if (password !== confirmPassword) { setError("Les deux mots de passe ne correspondent pas."); return; }
    if (role === "vendor" && !shopName.trim()) { setError("Le nom de la boutique est requis."); return; }

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
      }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) { setError(data.error || "Erreur lors de l'inscription."); return; }
    router.push(role === "vendor" ? "/vendor/dashboard" : "/");
  }

  return (
    <div className="shell">
      <div className="register-topbar">
        <Link href="/" aria-label="Accueil Kimoxa"><KimoxaLogo size={30} /></Link>
        <span className="register-topbar-link">
          Déjà inscrit ? <Link href="/login">Se connecter</Link>
        </span>
      </div>

      <div className="register-layout" style={{ gridTemplateColumns: "minmax(0, 680px)", justifyContent: "center" }}>
        <div className="register-form-col">
          <h1>Créer mon compte</h1>
          
          <a href="/api/auth/google" style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
            width: "100%", padding: "12px 16px", background: "#fff", color: "#18181b",
            border: "1px solid #27272a", borderRadius: 10, fontSize: "0.95rem", fontWeight: 600,
            textDecoration: "none", marginBottom: 20,
          }}>
            <GoogleIcon size={20} />
            Continuer avec Google
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 0 24px", color: "var(--ink-400)", fontSize: "0.8rem" }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span>ou créez un compte avec votre email</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>
          <p className="register-subtitle">Rejoignez la marketplace de confiance de l'Afrique</p>

          {error && <div className="error-box">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="account-type-choice" role="radiogroup">
              <button
                type="button"
                className={`account-type-card ${role === "buyer" ? "is-selected" : ""}`}
                onClick={() => setRole("buyer")}
              >
                <strong style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <ShoppingCartIcon size={18} style={{ color: "var(--gold-600)" }} /> Je veux acheter
                </strong>
                <span>Accès immédiat et gratuit</span>
              </button>
              <button
                type="button"
                className={`account-type-card ${role === "vendor" ? "is-selected" : ""}`}
                onClick={() => setRole("vendor")}
              >
                <strong style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <StoreIcon size={18} style={{ color: "var(--gold-600)" }} /> Je veux vendre
                </strong>
                <span>Boutique vérifiée, sans limite de vente</span>
              </button>
            </div>

            <div className="register-section">
              <h2 className="register-section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <UserIcon size={16} style={{ color: "var(--gold-600)" }} /> 1 · Mon profil
              </h2>
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
                  <label htmlFor="r-phone" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <SmartphoneIcon size={14} /> Téléphone *
                  </label>
                  <input id="r-phone" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+226 70 00 00 00" />
                </div>
              </div>
              <div className="form-row">
                <div>
                  <label htmlFor="r-dob" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <CalendarIcon size={14} /> Date de naissance *
                  </label>
                  <input id="r-dob" type="date" required max={maxDateStr} value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
                </div>
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

            <div className="register-section">
              <h2 className="register-section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <LockIcon size={16} style={{ color: "var(--gold-600)" }} /> 2 · Sécurité
              </h2>
              <div className="form-row">
                <div>
                  <label htmlFor="r-password">Mot de passe *</label>
                  <input
                    id="r-password" type="password" required minLength={8}
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="8 caractères minimum"
                  />
                  {password && (
                    <div className="pwd-strength">
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
                  <label htmlFor="r-password-confirm">Confirmer *</label>
                  <input
                    id="r-password-confirm" type="password" required minLength={8}
                    value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Retapez le mot de passe"
                    style={{ borderColor: pwdMismatch ? "#dc2626" : pwdMatch ? "#16a34a" : undefined }}
                  />
                  {pwdMatch && <small style={{ color: "#16a34a", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: 4 }}><CheckCircleIcon size={12} /> Identiques</small>}
                  {pwdMismatch && <small style={{ color: "#dc2626", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: 4 }}><XCircleIcon size={12} /> Différents</small>}
                </div>
              </div>
            </div>

            {role === "vendor" && (
              <div className="register-section">
                <h2 className="register-section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <StoreIcon size={16} style={{ color: "var(--gold-600)" }} /> 3 · Ma boutique
                </h2>
                <p style={{ fontSize: "0.82rem", color: "var(--ink-400)", margin: "0 0 12px", lineHeight: 1.5 }}>
                  Votre boutique est créée immédiatement. Une fois connecté, votre tableau de bord
                  vous demandera votre <strong>pièce d'identité</strong> pour tout débloquer —
                  après validation, vous vendez <strong>sans aucune limite</strong>.
                </p>
                <div className="form-row">
                  <div>
                    <label htmlFor="r-shop-name">Nom de la boutique *</label>
                    <input id="r-shop-name" required value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="Ex : Boutique Aïcha Mode" />
                  </div>
                  <div>
                    <label htmlFor="r-shop-city">Ville</label>
                    <input id="r-shop-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex : Ouagadougou" />
                  </div>
                  <div>
                    <label htmlFor="r-shop-category">Catégorie principale</label>
                    <select id="r-shop-category" value={mainCategoryId} onChange={(e) => setMainCategoryId(e.target.value)}>
                      <option value="">Sélectionner...</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            <label className="checkbox-row" htmlFor="r-agree-terms">
              <input id="r-agree-terms" type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} required />
              <span>
                J'accepte les <Link href="/cgu" target="_blank">CGU</Link> et les <Link href="/cgv" target="_blank">CGV</Link> de Kimoxa *
              </span>
            </label>

            <button type="submit" className="btn btn-primary register-submit" disabled={submitting} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {submitting ? "Création en cours..." : (
                <>
                  {role === "vendor" ? "Ouvrir ma boutique" : "Créer mon compte"}
                  <ChevronRightIcon size={16} />
                </>
              )}
            </button>

          <p style={{ textAlign: "center", marginTop: 16, fontSize: "0.8rem", color: "var(--ink-400)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <LockIcon size={12} /> Inscription securisee SSL - Donnees protegees
          </p>
          </form>
        </div>

        
      </div>
    </div>
  );
}


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

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="shell"><div className="content"><p>Chargement...</p></div></div>}>
      <RegisterForm />
    </Suspense>
  );
}
