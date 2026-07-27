"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AddressesPage() {
  const router = useRouter();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [libelle, setLibelle] = useState("");
  const [adresseTexte, setAdresseTexte] = useState("");
  const [phone, setPhone] = useState("");

  function load() {
    fetch("/api/addresses").then(async (res) => {
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      setAddresses(data.addresses || []);
      setLoading(false);
    });
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const res = await fetch("/api/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ libelle, adresseTexte, phone }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Erreur lors de l'enregistrement.");
      return;
    }

    setSuccess("Adresse ajoutée.");
    setLibelle("");
    setAdresseTexte("");
    setPhone("");
    setShowForm(false);
    load();
  }

  async function handleSetDefault(id) {
    setError("");
    const res = await fetch(`/api/addresses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parDefaut: true }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Erreur lors de la mise à jour.");
      return;
    }
    load();
  }

  async function handleDelete(id) {
    if (!window.confirm("Supprimer cette adresse ?")) return;
    setError("");
    const res = await fetch(`/api/addresses/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Erreur lors de la suppression.");
      return;
    }
    load();
  }

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/shop" className="brand" style={{ textDecoration: "none" }}>
          🛒 FasoShop
        </Link>
        <div className="topbar-actions">
          <Link href="/orders"><button>Mes commandes</button></Link>
        </div>
      </div>
      <div className="woven-strip" />

      <div className="content">
        <div className="page-header">
          <h1>Mes adresses</h1>
          <p>Enregistrez vos adresses habituelles (domicile, travail...) pour les réutiliser à chaque commande.</p>
        </div>

        {error && <div className="error-box">{error}</div>}
        {success && <div className="success-box">{success}</div>}

        <div className="panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ marginBottom: 0 }}>Carnet d'adresses</h2>
            <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
              {showForm ? "Annuler" : "+ Ajouter une adresse"}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} style={{ marginTop: 18 }}>
              <div className="form-row">
                <div>
                  <label htmlFor="a-libelle">Libellé</label>
                  <input
                    id="a-libelle"
                    required
                    value={libelle}
                    onChange={(e) => setLibelle(e.target.value)}
                    placeholder="Ex : Domicile, Travail"
                  />
                </div>
                <div>
                  <label htmlFor="a-phone">Téléphone (optionnel)</label>
                  <input
                    id="a-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ex : 70 00 00 00"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="a-texte">Adresse (quartier, repère...)</label>
                <textarea
                  id="a-texte"
                  required
                  rows={3}
                  value={adresseTexte}
                  onChange={(e) => setAdresseTexte(e.target.value)}
                  placeholder="Ex : Ouaga 2000, Cité Azimo, près de la pharmacie..."
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: 10 }}>
                Enregistrer l'adresse
              </button>
            </form>
          )}

          {loading ? (
            <p style={{ marginTop: 16 }}>Chargement...</p>
          ) : addresses.length === 0 ? (
            <div className="empty-state">
              <div className="glyph">📍</div>
              <p>Aucune adresse enregistrée pour l'instant.</p>
            </div>
          ) : (
            <div style={{ marginTop: 16 }}>
              {addresses.map((a) => (
                <div
                  key={a.id}
                  style={{
                    border: "1px solid var(--sand-200)",
                    borderRadius: 8,
                    padding: 14,
                    marginBottom: 10,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <strong>{a.libelle}</strong>
                      {a.par_defaut && <span className="badge badge-ok">Par défaut</span>}
                    </div>
                    <div style={{ fontSize: "0.9rem", color: "var(--ink-400)" }}>{a.adresse_texte}</div>
                    {a.phone && <div className="sku" style={{ marginTop: 4 }}>{a.phone}</div>}
                  </div>
                  <div className="stock-adjust">
                    {!a.par_defaut && (
                      <button className="btn btn-ghost" onClick={() => handleSetDefault(a.id)}>
                        Définir par défaut
                      </button>
                    )}
                    <button className="btn btn-danger" onClick={() => handleDelete(a.id)}>
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
