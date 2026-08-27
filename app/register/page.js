"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import KimoxaLogo from "@/app/components/KimoxaLogo";
import { COUNTRIES } from "@/lib/countries";
import {
  ShoppingCartIcon, StoreIcon, LockIcon,
  ChevronRightIcon, UserIcon, SmartphoneIcon, CalendarIcon, MailIcon,
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

  useEffect(() => { if (searchParams.get("role") === "vendor") setRole("vendor"); }, [searchParams]);
  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then((d) => setCategories(d.categories || [])).catch(() => {});
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
      padding: "32px 16px 60px",
    }}>
      <div style={{
        maxWidth: 560, margin: "0 auto",
        background: "#18181b", borderRadius: 16,
        padding: "36px 32px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 24, ["--ink-900"]: "#ffffff", ["--ink-800"]: "#ffffff" }}>
          <KimoxaLogo size={42} withTagline />
        </div>

        <h1 style={{ margin: "0 0 8px", fontSize: "1.75rem", fontWeight: 700, color: "#fff", textAlign: "center", letterSpacing: "-0.02em" }}>
          Créer un compte
        </h1>
        <p style={{ margin: "0 0 24px", textAlign: "center", color: "#a1a1aa", fontSize: "0.95rem" }}>
          Rejoignez la marketplace de confiance de l'Afrique
        </p>

        <a href="/api/auth/google" style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
          width: "100%", padding: "12px 16px", background: "#fff", color: "#18181b",
          border: "none", borderRadius: 10, fontSize: "0.95rem", fontWeight: 600,
          textDecoration: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        }}>
          <GoogleIcon size={20} />
          Continuer avec Google
        </a>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0", color: "#52525b", fontSize: "0.8rem" }}>
          <div style={{ flex: 1, height: 1, background: "#27272a" }} />
          <span>ou créez un compte avec votre email</span>
          <div style={{ flex: 1, height: 1, background: "#27272a" }} />
        </div>

        {error && (
          <div style={{
            padding: "10px 14px", background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8,
            color: "#fca5a5", fontSize: "0.87rem", marginBottom: 20,
          }}>
            {error}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
          <button type="button" onClick={() => setRole("buyer")} style={{
            padding: "16px 12px",
            background: role === "buyer" ? "rgba(201,169,97,0.1)" : "#09090b",
            border: role === "buyer" ? "2px solid #c9a961" : "1px solid #27272a",
            borderRadius: 10, cursor: "pointer", textAlign: "left", color: "#fff",
          }}>
            <strong style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.95rem", color: role === "buyer" ? "#c9a961" : "#fff" }}>
              <ShoppingCartIcon size={18} /> Je veux acheter
            </strong>
            <span style={{ display: "block", marginTop: 4, fontSize: "0.78rem", color: "#a1a1aa" }}>
              Accès immédiat et gratuit
            </span>
          </button>
          <button type="button" onClick={() => setRole("vendor")} style={{
            padding: "16px 12px",
            background: role === "vendor" ? "rgba(201,169,97,0.1)" : "#09090b",
            border: role === "vendor" ? "2px solid #c9a961" : "1px solid #27272a",
            borderRadius: 10, cursor: "pointer", textAlign: "left", color: "#fff",
          }}>
            <strong style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.95rem", color: role === "vendor" ? "#c9a961" : "#fff" }}>
              <StoreIcon size={18} /> Je veux vendre
            </strong>
            <span style={{ display: "block", marginTop: 4, fontSize: "0.78rem", color: "#a1a1aa" }}>
              Boutique vérifiée, sans limite
            </span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <h2 style={{ fontSize: "0.9rem", fontWeight: 700, color: "#c9a961", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8, letterSpacing: "0.02em" }}>
            <UserIcon size={16} /> 1 · MON PROFIL
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label htmlFor="r-firstname" style={labelStyle}>Prénom *</label><input id="r-firstname" required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ex : Aïcha" style={inputStyle} /></div>
            <div><label htmlFor="r-lastname" style={labelStyle}>Nom *</label><input id="r-lastname" required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Ex : Ouédraogo" style={inputStyle} /></div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label htmlFor="r-email" style={labelStyle}>Email *</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#52525b", display: "flex" }}><MailIcon size={16} /></span>
              <input id="r-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" style={{ ...inputStyle, paddingLeft: 40 }} />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label htmlFor="r-phone" style={labelStyle}>Téléphone *</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#52525b", display: "flex" }}><SmartphoneIcon size={16} /></span>
              <input id="r-phone" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+226 70 00 00 00" style={{ ...inputStyle, paddingLeft: 40 }} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
            <div><label htmlFor="r-dob" style={labelStyle}>Naissance *</label><input id="r-dob" type="date" required max={maxDateStr} value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} style={{ ...inputStyle, padding: "10px 12px" }} /></div>
            <div><label htmlFor="r-nationality" style={labelStyle}>Nationalité *</label><select id="r-nationality" required value={nationalityCode} onChange={(e) => setNationalityCode(e.target.value)} style={inputStyle}>{COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select></div>
            <div><label htmlFor="r-country" style={labelStyle}>Résidence *</label><select id="r-country" required value={countryOfResidenceCode} onChange={(e) => setCountryOfResidenceCode(e.target.value)} style={inputStyle}>{COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select></div>
          </div>

          <h2 style={{ fontSize: "0.9rem", fontWeight: 700, color: "#c9a961", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8, letterSpacing: "0.02em" }}>
            <LockIcon size={16} /> 2 · SÉCURITÉ
          </h2>

          <div style={{ marginBottom: 12 }}>
            <label htmlFor="r-password" style={labelStyle}>Mot de passe *</label>
            <input id="r-password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8 caractères minimum" style={inputStyle} />
            {password && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= pwdStrength ? STRENGTH_COLORS[pwdStrength] : "#27272a", transition: "background 0.2s" }} />
                  ))}
                </div>
                <small style={{ color: STRENGTH_COLORS[pwdStrength], fontSize: "0.75rem", fontWeight: 600 }}>
                  Force : {STRENGTH_LABELS[pwdStrength]}
                </small>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 24 }}>
            <label htmlFor="r-password-confirm" style={labelStyle}>Confirmer *</label>
            <input id="r-password-confirm" type="password" required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Retapez" style={{ ...inputStyle, borderColor: pwdMismatch ? "#dc2626" : pwdMatch ? "#16a34a" : "#27272a" }} />
            {pwdMatch && <small style={{ color: "#16a34a", fontSize: "0.75rem", marginTop: 4, display: "block" }}>✓ Les mots de passe correspondent</small>}
            {pwdMismatch && <small style={{ color: "#dc2626", fontSize: "0.75rem", marginTop: 4, display: "block" }}>✗ Les mots de passe ne correspondent pas</small>}
          </div>

          {role === "vendor" && (
            <>
              <h2 style={{ fontSize: "0.9rem", fontWeight: 700, color: "#c9a961", margin: "0 0 8px", display: "flex", alignItems: "center", gap: 8, letterSpacing: "0.02em" }}>
                <StoreIcon size={16} /> 3 · MA BOUTIQUE
              </h2>
              <p style={{ fontSize: "0.82rem", color: "#a1a1aa", margin: "0 0 16px", lineHeight: 1.6, padding: "10px 12px", background: "#09090b", borderRadius: 8, border: "1px solid #27272a" }}>
                Votre boutique est créée immédiatement. Une fois connecté, votre tableau de bord
                vous demandera votre <strong style={{ color: "#fff" }}>pièce d'identité</strong> pour tout débloquer —
                après validation, vous vendez <strong style={{ color: "#c9a961" }}>sans aucune limite</strong>.
              </p>
              <div style={{ marginBottom: 12 }}>
                <label htmlFor="r-shop-name" style={labelStyle}>Nom de la boutique *</label>
                <input id="r-shop-name" required value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="Ex : Boutique Élégance" style={inputStyle} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
                <div><label htmlFor="r-shop-city" style={labelStyle}>Ville</label><input id="r-shop-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex : Ouagadougou" style={inputStyle} /></div>
                <div><label htmlFor="r-shop-category" style={labelStyle}>Catégorie principale</label><select id="r-shop-category" value={mainCategoryId} onChange={(e) => setMainCategoryId(e.target.value)} style={inputStyle}><option value="">Sélectionner...</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}</select></div>
              </div>
            </>
          )}

          <label style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            padding: "12px 14px", background: "#09090b",
            border: "1px solid #27272a", borderRadius: 10,
            marginBottom: 20, cursor: "pointer", fontSize: "0.85rem", color: "#a1a1aa", lineHeight: 1.5,
          }}>
            <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} required style={{ marginTop: 2, accentColor: "#c9a961" }} />
            <span>J'accepte les <Link href="/cgu" target="_blank" style={{ color: "#c9a961" }}>CGU</Link> et les <Link href="/cgv" target="_blank" style={{ color: "#c9a961" }}>CGV</Link> de Kimoxa *</span>
          </label>

          <button type="submit" disabled={submitting} style={{
            width: "100%", padding: "13px 16px",
            background: "linear-gradient(135deg, #c9a961 0%, #a88941 100%)",
            color: "#0a0a0a", border: "none", borderRadius: 10,
            fontSize: "0.95rem", fontWeight: 700,
            cursor: submitting ? "not-allowed" : "pointer",
            letterSpacing: "0.01em", boxShadow: "0 4px 14px rgba(201,169,97,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            {submitting ? "Création en cours..." : (<>{role === "vendor" ? "Ouvrir ma boutique" : "Créer mon compte"}<ChevronRightIcon size={16} /></>)}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 24, fontSize: "0.9rem", color: "#a1a1aa" }}>
          Déjà inscrit ? <Link href="/login" style={{ color: "#c9a961", fontWeight: 600, textDecoration: "none" }}>Se connecter</Link>
        </p>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: "0.75rem", color: "#52525b", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <LockIcon size={11} /> Inscription sécurisée SSL — Données protégées
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>Chargement...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
