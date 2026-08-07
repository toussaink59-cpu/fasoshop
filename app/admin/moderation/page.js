"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import AdminBottomNav from "@/app/components/AdminBottomNav";

export default function AdminModerationPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [sponsorships, setSponsorships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingReviewId, setDeletingReviewId] = useState(null);
  const [decidingSponsorId, setDecidingSponsorId] = useState(null);

  const loadReviews = useCallback(async () => {
    const res = await fetch("/api/admin/reviews");
    if (res.ok) {
      const data = await res.json();
      setReviews(data.reviews || []);
    }
  }, []);

  const loadSponsorships = useCallback(async () => {
    const res = await fetch("/api/admin/sponsorships");
    if (res.ok) {
      const data = await res.json();
      setSponsorships(data.requests || []);
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.user || data.user.role !== "admin") {
          router.push("/login");
          return;
        }
        setUser(data.user);
        Promise.all([loadReviews(), loadSponsorships()]).then(() => setLoading(false));
      });
  }, [loadReviews, loadSponsorships, router]);

  async function handleSponsorDecision(requestId, status) {
    setError("");
    setDecidingSponsorId(requestId);

    const res = await fetch(`/api/admin/sponsorships/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();

    setDecidingSponsorId(null);

    if (!res.ok) {
      setError(data.error || "Erreur lors du traitement de la demande.");
      return;
    }

    loadSponsorships();
  }

  async function handleDeleteReview(reviewId) {
    if (!window.confirm("Supprimer définitivement cet avis ?")) return;

    setError("");
    setDeletingReviewId(reviewId);

    const res = await fetch(`/api/admin/reviews/${reviewId}`, {
      method: "DELETE",
    });

    setDeletingReviewId(null);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Erreur lors de la suppression de l'avis.");
      return;
    }

    setReviews((r) => r.filter((rev) => rev.id !== reviewId));
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const pendingModerationCount = sponsorships.filter((s) => s.status === "pending").length;

  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand">
          🛒 Kimoxa <span className="role-tag">Admin</span>
        </div>
        <div className="topbar-actions">
          <button onClick={handleLogout}>Déconnexion</button>
        </div>
      </div>
      <div className="woven-strip" />

      <div className="content">
        <div className="page-header">
          <h1>Modération</h1>
          <p>{user ? `Connecté en tant que ${user.full_name}` : ""}</p>
        </div>

        {error && <div className="error-box">{error}</div>}

        {loading ? (
          <p>Chargement...</p>
        ) : (
          <>
            <div className="panel">
              <h2>Demandes de sponsoring</h2>
              <p style={{ fontSize: "0.85rem", color: "var(--ink-400)", marginTop: -8, marginBottom: 16 }}>
                Un vendeur a demandé la mise en avant d'un produit. Vérifiez que le paiement a bien été reçu (par ailleurs, tant que le paiement en ligne n'est pas automatisé) avant de valider.
              </p>

              {sponsorships.filter((s) => s.status === "pending").length === 0 ? (
                <p style={{ color: "var(--ink-400)" }}>Aucune demande en attente.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Produit</th>
                      <th>Boutique</th>
                      <th>Vendeur</th>
                      <th>Prix</th>
                      <th>Demandé le</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sponsorships.filter((s) => s.status === "pending").map((s) => (
                      <tr key={s.id}>
                        <td>{s.product_name}</td>
                        <td>{s.shop_name}</td>
                        <td>{s.vendor_name}</td>
                        <td>{Number(s.price).toLocaleString("fr-FR")} FCFA</td>
                        <td>{new Date(s.requested_at).toLocaleDateString("fr-FR")}</td>
                        <td>
                          <div className="stock-adjust">
                            <button
                              className="btn btn-primary"
                              disabled={decidingSponsorId === s.id}
                              onClick={() => handleSponsorDecision(s.id, "approved")}
                            >
                              Valider (30j)
                            </button>
                            <button
                              className="btn btn-danger"
                              disabled={decidingSponsorId === s.id}
                              onClick={() => handleSponsorDecision(s.id, "rejected")}
                            >
                              Rejeter
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="panel">
              <h2>Avis clients</h2>
              <p style={{ fontSize: "0.85rem", color: "var(--ink-400)", marginTop: -8, marginBottom: 16 }}>
                Modérez les avis abusifs, faux ou inappropriés.
              </p>

              {reviews.length === 0 ? (
                <p style={{ color: "var(--ink-400)" }}>Aucun avis pour l'instant.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Produit</th>
                      <th>Boutique</th>
                      <th>Auteur</th>
                      <th>Note</th>
                      <th>Commentaire</th>
                      <th>Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviews.map((r) => (
                      <tr key={r.id}>
                        <td>{r.product_name}</td>
                        <td>{r.shop_name}</td>
                        <td>{r.buyer_name}</td>
                        <td>{"⭐".repeat(r.rating)}</td>
                        <td style={{ maxWidth: 260 }}>{r.comment || "—"}</td>
                        <td>{new Date(r.created_at).toLocaleDateString("fr-FR")}</td>
                        <td>
                          <button
                            className="btn btn-danger"
                            disabled={deletingReviewId === r.id}
                            onClick={() => handleDeleteReview(r.id)}
                          >
                            {deletingReviewId === r.id ? "..." : "Supprimer"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
      <AdminBottomNav pendingModerationCount={pendingModerationCount} />
    </div>
  );
}
