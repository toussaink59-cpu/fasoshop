"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import KimoxaLogo from "@/app/components/KimoxaLogo";
import { COUNTRIES } from "@/lib/countries";

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

// Compression côté client (la photo de la pièce reste légère en base)
async function compressImage(file, maxDim = 900, quality = 0.72) {
  const raw = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = raw;
  });
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
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

  // Vendeur
  const [shopName, setShopName] = useState("");
  const [mainCategoryId, setMainCategoryId] = useState("");
  const [city, setCity] = useState("");
  const [idDocumentType, setIdDocumentType] = useState("cni");
  const [idDocumentNumber, setIdDocumentNumber] = useState("");
  const [docDataUrl, setDocDataUrl] = useState("");
  const [docBusy, setDocBusy] = useState(false);

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

  async function handleDocFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Format non supporté. Utilisez JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Image trop lourde (8 Mo max).");
      return;
    }
    setDocBusy(true);
    try {
      const dataUrl = await compressImage(file);
      setDocDataUrl(dataUrl);
    } catch {
      setError("Impossible de lire cette image.");
    }
    setDocBusy(false);
  }

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
    if (role === "vendor") {
      if (!shopName.trim()) {
        setError("Le nom de la boutique est requis.");
        return;
      }
      if (!idDocumentNumber.trim()) {
        setError("Le numéro de la pièce d'identité est requis.");
        return;
      }
      if (!docDataUrl) {
        setError("La photo de la pièce d'identité est obligatoire pour vendre.");
        return;
      }
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
        idDocumentType: role === "vendor" ? idDocumentType : undefined,
        idDocumentNumber: role === "vendor" ? idDocumentNumber : undefined,
        idDocumentUrl: role === "vendor" ? docDataUrl : undefined,
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
      {/* Barre supérieure professionnelle */}
      <div className="register-topbar">
        <Link href="/" aria-label="Accueil Kimoxa">
          <KimoxaLogo size={30} />
        </Link>
        <span className="register-topbar-link">
          Déjà inscrit ? <Link href="/login">Se connecter</Link>
        </span>
      </div>

      <div className="register-layout">
        {/* ====== FORMULAIRE ====== */}
        <div className="register-form-col">
          <h1>Créer mon compte</h1>
          <p className="register-subtitle">Rejoignez la marketplace de confiance de l'Afrique</p>

          {error && <div className="error-box">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="account-type-choice" role="radiogroup">
              <button
                type="button"
                className={`account-type-card ${role === "buyer" ? "is-selected" : ""}`}
                onClick={() => setRole("buyer")}
              >
                <strong>🛍️ Je veux acheter</strong>
                <span>Accès immédiat et gratuit</span>
              </button>
              <button
                type="button"
                className={`account-type-card ${role === "vendor" ? "is-selected" : ""}`}
                onClick={() => setRole("vendor")}
              >
                <strong>🏪 Je veux vendre</strong>
                <span>Boutique vérifiée, sans limite de vente</span>
              </button>
            </div>

            {/* 1 · Profil */}
            <div className="register-section">
              <h2 className="register-section-title">1 · Mon profil</h2>
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

            {/* 2 · Sécurité */}
            <div className="register-section">
              <h2 className="register-section-title">2 · Sécurité</h2>
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
                            style={{ background: i <= pwdStrength ? STRENGTH_COLORS[pwdStrength] : "#e5e7eb" }}
                          />
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
                    id="r-password-confirm"
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Retapez le mot de passe"
                    style={{ borderColor: pwdMismatch ? "#dc2626" : pwdMatch ? "#16a34a" : undefined }}
                  />
                  {pwdMatch && <small style={{ color: "#16a34a", fontSize: "0.75rem" }}>✓ Identiques</small>}
                  {pwdMismatch && <small style={{ color: "#dc2626", fontSize: "0.75rem" }}>✗ Différents</small>}
                </div>
              </div>
            </div>

            {/* 3 · Boutique + 4 · Vérification (vendeur) */}
            {role === "vendor" && (
              <>
                <div className="register-section">
                  <h2 className="register-section-title">3 · Ma boutique</h2>
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

                <div className="register-section">
                  <h2 className="register-section-title">4 · Vérification d'identité *</h2>
                  <p style={{ fontSize: "0.82rem", color: "var(--ink-400)", margin: "0 0 12px", lineHeight: 1.5 }}>
                    Comme sur les grandes marketplaces, chaque vendeur Kimoxa est vérifié.
                    Une fois votre pièce validée (moins de 24 h), vous vendez <strong>sans aucune limite</strong> de produits ou de gains.
                  </p>
                  <div className="form-row">
                    <div>
                      <label htmlFor="r-doc-type">Type de pièce *</label>
                      <select id="r-doc-type" value={idDocumentType} onChange={(e) => setIdDocumentType(e.target.value)}>
                        <option value="cni">Carte Nationale d'Identité (CNI)</option>
                        <option value="passeport">Passeport</option>
                        <option value="permis">Permis de conduire</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="r-doc-number">Numéro de la pièce *</label>
                      <input id="r-doc-number" required value={idDocumentNumber} onChange={(e) => setIdDocumentNumber(e.target.value)} placeholder="Ex : B01234567" />
                    </div>
                  </div>
                  <label className="doc-upload-zone" htmlFor="r-doc-file">
                    {docDataUrl ? (
                      <>
                        <img src={docDataUrl} alt="Aperçu de la pièce" className="doc-upload-preview" />
                        <div className="doc-upload-hint">✅ Photo ajoutée — cliquez pour remplacer</div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: "1.8rem" }}>🪪</div>
                        <strong>{docBusy ? "Traitement..." : "Photo de la pièce (recto)"}</strong>
                        <div className="doc-upload-hint">JPG, PNG ou WEBP · 8 Mo max · image nette et lisible</div>
                      </>
                    )}
                  </label>
                  <input
                    id="r-doc-file"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: "none" }}
                    onChange={handleDocFile}
                  />
                  <div className="trust-security" style={{ justifyContent: "flex-start", color: "var(--ink-400)", paddingTop: 10 }}>
                    <span>🔒</span>
                    <span>Vos données sont chiffrées et utilisées uniquement pour la vérification.</span>
                  </div>
                </div>
              </>
            )}

            <label className="checkbox-row" htmlFor="r-agree-terms">
              <input id="r-agree-terms" type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} required />
              <span>
                J'accepte les <Link href="/cgu" target="_blank">CGU</Link> et les <Link href="/cgv" target="_blank">CGV</Link> de Kimoxa *
              </span>
            </label>

            <button type="submit" className="btn btn-primary register-submit" disabled={submitting || docBusy}>
              {submitting ? "Création en cours..." : role === "vendor" ? "Ouvrir ma boutique →" : "Créer mon compte →"}
            </button>
          </form>
        </div>

        {/* ====== PANNEAU CONFIANCE ALLÉGÉ ====== */}
        <aside className="register-trust-col">
          <div className="trust-card">
            <h2>🛡️ Achetez en toute confiance</h2>
            <ul className="trust-list">
              <li>
                <span className="trust-icon">🔒</span>
                <div>
                  <strong>Paiement sécurisé</strong>
                  <span>L'argent est libéré uniquement à la livraison</span>
                </div>
              </li>
              <li>
                <span className="trust-icon">🪪</span>
                <div>
                  <strong>Vendeurs vérifiés</strong>
                  <span>Identité contrôlée avant de vendre</span>
                </div>
              </li>
              <li>
                <span className="trust-icon">↩️</span>
                <div>
                  <strong>Retours 7 jours</strong>
                  <span>Satisfait ou remboursé</span>
                </div>
              </li>
            </ul>
            <div className="trust-security">
              <span>🔒</span>
              <span>Connexion sécurisée SSL · Données protégées</span>
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
