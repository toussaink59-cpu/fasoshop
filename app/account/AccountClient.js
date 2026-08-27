"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SiteHeader from "@/app/components/SiteHeader";
import BottomNav from "@/app/components/BottomNav";
import {
  PackageIcon, HeartIcon, MapPinIcon, MessageIcon, StoreIcon,
  ChevronRightIcon, UserIcon, LockIcon, SettingsIcon, LogOutIcon,
  MailIcon, SmartphoneIcon, CalendarIcon, ShieldIcon, EyeIcon, EyeOffIcon,
} from "@/app/components/Icons";
import { COUNTRIES } from "@/lib/countries";

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

const TABS = [
  { id: "profile", label: "Profil", Icon: UserIcon },
  { id: "security", label: "Sécurité", Icon: ShieldIcon },
  { id: "links", label: "Mes liens", Icon: PackageIcon },
  { id: "settings", label: "Paramètres", Icon: SettingsIcon },
];

export default function AccountClient({ initialUser, categories }) {
  const router = useRouter();
  const [tab, setTab] = useState("profile");
  const [user, setUser] = useState(initialUser);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  // Profil form
  const [firstName, setFirstName] = useState(initialUser?.first_name || "");
  const [lastName, setLastName] = useState(initialUser?.last_name || "");
  const [phone, setPhone] = useState(initialUser?.phone || "");
  const [dateOfBirth, setDateOfBirth] = useState(initialUser?.date_of_birth ? initialUser.date_of_birth.slice(0, 10) : "");
  const [nationality, setNationality] = useState(initialUser?.nationality || "BF");
  const [country, setCountry] = useState(initialUser?.country_of_residence || "BF");

  // Password form
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState({ type: "", text: "" });

  async function saveProfile(e) {
    e.preventDefault();
    setMsg({ type: "", text: "" });
    setLoading(true);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || null,
          date_of_birth: dateOfBirth || null,
          nationality,
          country_of_residence: country,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setUser(data.user);
      setMsg({ type: "success", text: "Profil mis à jour avec succès." });
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    setPwdMsg({ type: "", text: "" });
    if (newPwd.length < 8) return setPwdMsg({ type: "error", text: "8 caractères minimum." });
    if (newPwd !== confirmPwd) return setPwdMsg({ type: "error", text: "Les mots de passe ne correspondent pas." });
    setPwdLoading(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setPwdMsg({ type: "success", text: data.message || "Mot de passe modifié." });
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    } catch (err) {
      setPwdMsg({ type: "error", text: err.message });
    } finally {
      setPwdLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  const fullName = user?.full_name || user?.name || "cher client";
  const initials = fullName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const isGoogleOnly = user?.provider === "google";

  const inputStyle = {
    width: "100%", padding: "11px 14px",
    background: "#fff", border: "1px solid var(--border)",
    borderRadius: 8, color: "var(--ink-900)", fontSize: "0.92rem",
    outline: "none", boxSizing: "border-box",
  };
  const labelStyle = {
    display: "block", marginBottom: 6,
    fontSize: "0.8rem", fontWeight: 600, color: "var(--ink-600)",
  };

  const sections = [
    { href: "/orders", Icon: PackageIcon, title: "Mes commandes", desc: "Suivre mes achats et livraisons" },
    { href: "/favoris", Icon: HeartIcon, title: "Mes favoris", desc: "Ma liste d'envies" },
    { href: "/account/addresses", Icon: MapPinIcon, title: "Mes adresses", desc: "Gérer mes adresses de livraison" },
    { href: "/messages", Icon: MessageIcon, title: "Messages", desc: "Discuter avec les vendeurs" },
    initialUser?.role === "vendor"
      ? { href: "/vendor/dashboard", Icon: StoreIcon, title: "Ma boutique", desc: "Gérer mes produits et mon stock" }
      : { href: "/devenir-vendeur", Icon: StoreIcon, title: "Devenir vendeur", desc: "Ouvrir ma boutique sur Kimoxa" },
  ];

  return (
    <div className="shell">
      <SiteHeader initialUser={initialUser} categories={categories} />

      <div style={{ maxWidth: 1100, margin: "24px auto", padding: "0 16px 80px" }}>
        {/* Banner */}
        <div style={{
          background: "linear-gradient(135deg, #0a0a0a 0%, #1a1410 100%)",
          borderRadius: 16, padding: "28px 28px",
          display: "flex", alignItems: "center", gap: 18,
          marginBottom: 24, color: "#fff",
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "linear-gradient(135deg, #c9a961 0%, #a88941 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.5rem", fontWeight: 700, color: "#0a0a0a",
            flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 700, letterSpacing: "-0.01em", color: "#ffffff" }}>
              Bonjour, {fullName}
            </h1>
            <p style={{ margin: "4px 0 0", color: "#a1a1aa", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span>{user?.email}</span>
              <span style={{
                padding: "2px 8px", background: "rgba(201,169,97,0.2)",
                color: "#c9a961", borderRadius: 10, fontSize: "0.72rem",
                fontWeight: 600, letterSpacing: "0.02em",
              }}>
                {user?.role === "vendor" ? "VENDEUR" : "ACHETEUR"}
              </span>
              {isGoogleOnly && (
                <span style={{
                  padding: "2px 8px", background: "rgba(66,133,244,0.15)",
                  color: "#60a5fa", borderRadius: 10, fontSize: "0.72rem",
                  fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4,
                }}>
                  <GoogleIcon size={11} /> Google
                </span>
              )}
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 24, alignItems: "start" }}>
          {/* Tabs latéraux (desktop) */}
          <nav style={{
            background: "#fff", borderRadius: 12, padding: 8,
            border: "1px solid var(--border)",
            position: "sticky", top: 80,
          }}>
            {TABS.map((t) => {
              const Icon = t.Icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    width: "100%", padding: "10px 14px",
                    background: active ? "var(--gold-50)" : "transparent",
                    border: "none", borderRadius: 8,
                    color: active ? "var(--gold-700)" : "var(--ink-700)",
                    fontWeight: active ? 600 : 500, fontSize: "0.9rem",
                    cursor: "pointer", marginBottom: 2,
                    textAlign: "left",
                  }}
                >
                  <Icon size={16} />
                  {t.label}
                </button>
              );
            })}
            <div style={{ height: 1, background: "var(--border)", margin: "8px 4px" }} />
            <button
              onClick={logout}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", padding: "10px 14px",
                background: "transparent", border: "none", borderRadius: 8,
                color: "#dc2626", fontWeight: 500, fontSize: "0.9rem",
                cursor: "pointer", textAlign: "left",
              }}
            >
              <LogOutIcon size={16} />
              Déconnexion
            </button>
          </nav>

          {/* Contenu */}
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, border: "1px solid var(--border)" }}>
            {tab === "profile" && (
              <>
                <h2 style={{ margin: "0 0 4px", fontSize: "1.3rem", fontWeight: 700, color: "var(--ink-900)" }}>
                  Mes informations
                </h2>
                <p style={{ margin: "0 0 24px", color: "var(--ink-500)", fontSize: "0.9rem" }}>
                  Ces informations sont utilisées pour vos commandes et vos communications avec Kimoxa.
                </p>

                {msg.text && (
                  <div style={{
                    padding: "10px 14px", borderRadius: 8, marginBottom: 20,
                    background: msg.type === "success" ? "#f0fdf4" : "#fef2f2",
                    color: msg.type === "success" ? "#166534" : "#991b1b",
                    border: `1px solid ${msg.type === "success" ? "#86efac" : "#fca5a5"}`,
                    fontSize: "0.87rem",
                  }}>
                    {msg.text}
                  </div>
                )}

                <div style={{
                  padding: "10px 14px", background: "#f9fafb", borderRadius: 8,
                  marginBottom: 20, display: "flex", alignItems: "center", gap: 10,
                  fontSize: "0.85rem", color: "var(--ink-600)",
                }}>
                  <MailIcon size={16} style={{ color: "var(--ink-400)" }} />
                  <span><strong style={{ color: "var(--ink-900)" }}>Email :</strong> {user?.email}</span>
                  <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "var(--ink-400)" }}>Non modifiable</span>
                </div>

                <form onSubmit={saveProfile}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                    <div>
                      <label htmlFor="p-firstname" style={labelStyle}>Prénom</label>
                      <input id="p-firstname" value={firstName} onChange={(e) => setFirstName(e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                      <label htmlFor="p-lastname" style={labelStyle}>Nom</label>
                      <input id="p-lastname" value={lastName} onChange={(e) => setLastName(e.target.value)} style={inputStyle} />
                    </div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label htmlFor="p-phone" style={labelStyle}>Téléphone</label>
                    <input id="p-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+226 70 00 00 00" style={inputStyle} />
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label htmlFor="p-dob" style={labelStyle}>Date de naissance</label>
                    <input id="p-dob" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} style={inputStyle} />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
                    <div>
                      <label htmlFor="p-nationality" style={labelStyle}>Nationalité</label>
                      <select id="p-nationality" value={nationality} onChange={(e) => setNationality(e.target.value)} style={inputStyle}>
                        {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="p-country" style={labelStyle}>Pays de résidence</label>
                      <select id="p-country" value={country} onChange={(e) => setCountry(e.target.value)} style={inputStyle}>
                        {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit" disabled={loading}
                    className="btn btn-primary"
                    style={{ padding: "11px 22px", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 8 }}
                  >
                    {loading ? "Enregistrement..." : "Enregistrer les modifications"}
                  </button>
                </form>

                <div style={{
                  marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--border)",
                  fontSize: "0.82rem", color: "var(--ink-500)",
                }}>
                  <strong style={{ color: "var(--ink-900)" }}>Compte créé le</strong>{" "}
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" }) : "-"}
                </div>
              </>
            )}

            {tab === "security" && (
              <>
                <h2 style={{ margin: "0 0 4px", fontSize: "1.3rem", fontWeight: 700, color: "var(--ink-900)" }}>
                  Sécurité du compte
                </h2>
                <p style={{ margin: "0 0 24px", color: "var(--ink-500)", fontSize: "0.9rem" }}>
                  Gérez votre mot de passe et vos méthodes de connexion.
                </p>

                {/* Méthodes de connexion */}
                <div style={{ marginBottom: 28 }}>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--ink-900)", margin: "0 0 12px" }}>
                    Méthodes de connexion
                  </h3>
                  <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                    <div style={{
                      padding: "14px 16px", display: "flex", alignItems: "center", gap: 12,
                      borderBottom: "1px solid var(--border)",
                    }}>
                      <GoogleIcon size={20} />
                      <div style={{ flex: 1 }}>
                        <strong style={{ display: "block", fontSize: "0.9rem", color: "var(--ink-900)" }}>Google</strong>
                        <small style={{ color: "var(--ink-500)", fontSize: "0.78rem" }}>
                          {isGoogleOnly ? "Méthode principale" : "Connecté"}
                        </small>
                      </div>
                      <span style={{
                        padding: "3px 10px", borderRadius: 10, fontSize: "0.72rem", fontWeight: 600,
                        background: (user?.google_id || isGoogleOnly) ? "#dcfce7" : "#f3f4f6",
                        color: (user?.google_id || isGoogleOnly) ? "#166534" : "var(--ink-500)",
                      }}>
                        {(user?.google_id || isGoogleOnly) ? "Connecté" : "Non lié"}
                      </span>
                    </div>
                    <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                      <MailIcon size={20} style={{ color: "var(--ink-600)" }} />
                      <div style={{ flex: 1 }}>
                        <strong style={{ display: "block", fontSize: "0.9rem", color: "var(--ink-900)" }}>Email & mot de passe</strong>
                        <small style={{ color: "var(--ink-500)", fontSize: "0.78rem" }}>
                          {isGoogleOnly ? "Ajouter une connexion par mot de passe" : "Connexion activée"}
                        </small>
                      </div>
                      <span style={{
                        padding: "3px 10px", borderRadius: 10, fontSize: "0.72rem", fontWeight: 600,
                        background: isGoogleOnly ? "#f3f4f6" : "#dcfce7",
                        color: isGoogleOnly ? "var(--ink-500)" : "#166534",
                      }}>
                        {isGoogleOnly ? "Désactivé" : "Activé"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Changement mot de passe */}
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--ink-900)", margin: "0 0 12px" }}>
                  {isGoogleOnly ? "Créer un mot de passe" : "Changer mon mot de passe"}
                </h3>
                <p style={{ fontSize: "0.85rem", color: "var(--ink-500)", margin: "0 0 16px" }}>
                  {isGoogleOnly
                    ? "Vous vous connectez uniquement avec Google. Définissez un mot de passe pour activer la connexion par email."
                    : "Choisissez un mot de passe fort d'au moins 8 caractères."}
                </p>

                {pwdMsg.text && (
                  <div style={{
                    padding: "10px 14px", borderRadius: 8, marginBottom: 16,
                    background: pwdMsg.type === "success" ? "#f0fdf4" : "#fef2f2",
                    color: pwdMsg.type === "success" ? "#166534" : "#991b1b",
                    border: `1px solid ${pwdMsg.type === "success" ? "#86efac" : "#fca5a5"}`,
                    fontSize: "0.87rem",
                  }}>
                    {pwdMsg.text}
                  </div>
                )}

                <form onSubmit={changePassword}>
                  {!isGoogleOnly && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={labelStyle}>Mot de passe actuel</label>
                      <div style={{ position: "relative" }}>
                        <input
                          type={showCurrent ? "text" : "password"}
                          value={currentPwd}
                          onChange={(e) => setCurrentPwd(e.target.value)}
                          style={{ ...inputStyle, paddingRight: 44 }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrent(!showCurrent)}
                          style={{
                            position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                            background: "none", border: "none", cursor: "pointer",
                            color: "var(--ink-400)", padding: 4, display: "inline-flex",
                          }}
                        >
                          {showCurrent ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                        </button>
                      </div>
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
                    <div>
                      <label style={labelStyle}>Nouveau mot de passe</label>
                      <div style={{ position: "relative" }}>
                        <input
                          type={showNew ? "text" : "password"}
                          value={newPwd}
                          onChange={(e) => setNewPwd(e.target.value)}
                          placeholder="8 caractères min."
                          style={{ ...inputStyle, paddingRight: 44 }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNew(!showNew)}
                          style={{
                            position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                            background: "none", border: "none", cursor: "pointer",
                            color: "var(--ink-400)", padding: 4, display: "inline-flex",
                          }}
                        >
                          {showNew ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>Confirmer</label>
                      <input
                        type="password"
                        value={confirmPwd}
                        onChange={(e) => setConfirmPwd(e.target.value)}
                        placeholder="Retapez"
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  <button
                    type="submit" disabled={pwdLoading}
                    className="btn btn-primary"
                    style={{ padding: "11px 22px", fontWeight: 600 }}
                  >
                    {pwdLoading ? "Enregistrement..." : (isGoogleOnly ? "Créer le mot de passe" : "Modifier le mot de passe")}
                  </button>
                </form>
              </>
            )}

            {tab === "links" && (
              <>
                <h2 style={{ margin: "0 0 4px", fontSize: "1.3rem", fontWeight: 700, color: "var(--ink-900)" }}>
                  Mes liens rapides
                </h2>
                <p style={{ margin: "0 0 20px", color: "var(--ink-500)", fontSize: "0.9rem" }}>
                  Accédez rapidement à vos espaces.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {sections.map((s) => {
                    const Icon = s.Icon;
                    return (
                      <Link key={s.title} href={s.href} style={{
                        padding: "16px 18px",
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        display: "flex", alignItems: "center", gap: 14,
                        textDecoration: "none",
                        transition: "all 0.15s",
                      }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#f9fafb"; e.currentTarget.style.borderColor = "var(--gold-400)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "var(--border)"; }}
                      >
                        <span style={{
                          width: 40, height: 40, borderRadius: 10,
                          background: "var(--gold-50)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "var(--gold-600)", flexShrink: 0,
                        }}>
                          <Icon size={20} />
                        </span>
                        <div style={{ flex: 1 }}>
                          <strong style={{ display: "block", color: "var(--ink-900)", fontSize: "0.95rem" }}>
                            {s.title}
                          </strong>
                          <small style={{ color: "var(--ink-500)", fontSize: "0.82rem" }}>{s.desc}</small>
                        </div>
                        <ChevronRightIcon size={16} style={{ color: "var(--ink-400)" }} />
                      </Link>
                    );
                  })}
                </div>
              </>
            )}

            {tab === "settings" && (
              <>
                <h2 style={{ margin: "0 0 4px", fontSize: "1.3rem", fontWeight: 700, color: "var(--ink-900)" }}>
                  Paramètres
                </h2>
                <p style={{ margin: "0 0 24px", color: "var(--ink-500)", fontSize: "0.9rem" }}>
                  Préférences de votre compte.
                </p>

                <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                  <div style={{
                    padding: "16px 18px", display: "flex", alignItems: "center", gap: 14,
                    borderBottom: "1px solid var(--border)",
                  }}>
                    <span style={{
                      width: 38, height: 38, borderRadius: 8,
                      background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      🇫🇷
                    </span>
                    <div style={{ flex: 1 }}>
                      <strong style={{ display: "block", color: "var(--ink-900)", fontSize: "0.92rem" }}>Langue</strong>
                      <small style={{ color: "var(--ink-500)", fontSize: "0.82rem" }}>Français (bientôt : Anglais, Mooré, Dioula)</small>
                    </div>
                  </div>
                  <div style={{
                    padding: "16px 18px", display: "flex", alignItems: "center", gap: 14,
                    borderBottom: "1px solid var(--border)",
                  }}>
                    <span style={{
                      width: 38, height: 38, borderRadius: 8,
                      background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "1.2rem",
                    }}>
                      🔔
                    </span>
                    <div style={{ flex: 1 }}>
                      <strong style={{ display: "block", color: "var(--ink-900)", fontSize: "0.92rem" }}>Notifications</strong>
                      <small style={{ color: "var(--ink-500)", fontSize: "0.82rem" }}>Email et SMS (à venir)</small>
                    </div>
                  </div>
                  <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                    <span style={{
                      width: 38, height: 38, borderRadius: 8,
                      background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#dc2626",
                    }}>
                      🗑️
                    </span>
                    <div style={{ flex: 1 }}>
                      <strong style={{ display: "block", color: "var(--ink-900)", fontSize: "0.92rem" }}>Supprimer mon compte</strong>
                      <small style={{ color: "var(--ink-500)", fontSize: "0.82rem" }}>Supprime définitivement vos données (à venir)</small>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 32, padding: "16px 18px", background: "#f9fafb", borderRadius: 10, fontSize: "0.82rem", color: "var(--ink-600)", lineHeight: 1.6 }}>
                  <strong>Besoin d'aide ?</strong> Contactez-nous via{" "}
                  <Link href="/messages" style={{ color: "var(--gold-700)", fontWeight: 600 }}>la messagerie</Link>{" "}
                  ou par email à <a href="mailto:support@kimoxa.com" style={{ color: "var(--gold-700)", fontWeight: 600 }}>support@kimoxa.com</a>.
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <BottomNav user={initialUser} />
    </div>
  );
}
