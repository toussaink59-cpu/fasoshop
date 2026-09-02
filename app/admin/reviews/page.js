"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/lib/toast";
import { useRouter } from "next/navigation";
import Link from "next/link";

// P2-13 : moderation des avis avec pagination
export default function AdminReviewsPage() {
  const router = useRouter();
  const [reviews, setReviews] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async (p) => {
    setLoading(true);
    const res = await fetch("/api/admin/reviews?page=" + p + "&limit=25");
    if (res.status === 401 || res.status === 403) {
      router.push("/login");
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setReviews(data.reviews || []);
      setPagination(data.pagination || null);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => { load(page); }, [page, load]);

  async function handleDelete(id) {
    if (!window.confirm("Supprimer cet avis ?")) return;
    setBusyId(id);
    const res = await fetch("/api/admin/reviews/" + id, { method: "DELETE" });
    setBusyId(null);
    if (res.ok) load(page);
  }

  const cell = { padding: "12px 16px", fontSize: "14px", verticalAlign: "top" };
  const th = { padding: "12px 16px", textAlign: "left", fontSize: "13px", fontWeight: 600 };

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ marginBottom: "24px" }}>
        <Link href="/admin/dashboard" style={{ color: "#666", textDecoration: "none", fontSize: "14px" }}>
          ← Retour au dashboard
        </Link>
        <h1 style={{ margin: "12px 0 0", fontSize: "24px", fontWeight: 700 }}>
          Modération des avis ({pagination ? pagination.total : reviews.length})
        </h1>
      </div>

      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#666" }}>Chargement…</div>
      ) : reviews.length === 0 ? (
        <div style={{ padding: "40px", textAlign: "center", background: "#f9f9f9", borderRadius: "8px" }}>
          <p style={{ color: "#666" }}>Aucun avis pour l'instant</p>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: "8px", overflow: "hidden", border: "1px solid #e5e5e5" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f5f5f5", borderBottom: "1px solid #e5e5e5" }}>
                <th style={th}>Note</th>
                <th style={th}>Commentaire</th>
                <th style={th}>Client</th>
                <th style={th}>Produit</th>
                <th style={th}>Date</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={cell}>
                    <span style={{ color: "#f59e0b", fontWeight: 700 }}>
                      {"★".repeat(Number(r.rating))}{"☆".repeat(5 - Number(r.rating))}
                    </span>
                  </td>
                  <td style={{ ...cell, maxWidth: 320 }}>{r.comment || "—"}</td>
                  <td style={cell}>
                    <div>{r.buyer_name}</div>
                    <div style={{ fontSize: "12px", color: "#666" }}>{r.buyer_email}</div>
                  </td>
                  <td style={cell}>
                    <div>{r.product_name}</div>
                    <div style={{ fontSize: "12px", color: "#666" }}>{r.shop_name}</div>
                  </td>
                  <td style={{ ...cell, color: "#666", fontSize: "13px" }}>
                    {new Date(r.created_at).toLocaleDateString("fr-FR")}
                  </td>
                  <td style={cell}>
                    <button className="btn btn-danger" disabled={busyId === r.id} onClick={() => handleDelete(r.id)}>
                      {busyId === r.id ? "..." : "Supprimer"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && (pagination.totalPages || 0) > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 16 }}>
          <button className="btn btn-ghost" disabled={!pagination.hasPrev || loading} onClick={() => setPage(Math.max(1, page - 1))}>← Précédent</button>
          <span style={{ fontSize: "0.85rem", color: "#666" }}>
            Page {pagination.page} sur {pagination.totalPages} · {pagination.total} avis
          </span>
          <button className="btn btn-ghost" disabled={!pagination.hasNext || loading} onClick={() => setPage(page + 1)}>Suivant →</button>
        </div>
      )}
    </div>
  );
}
