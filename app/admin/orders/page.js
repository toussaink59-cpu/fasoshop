"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const ORDER_STATUS = {
  pending: { label: "En attente" },
  paid: { label: "Payée" },
  preparation: { label: "En préparation" },
  shipped: { label: "Expédiée" },
  delivered: { label: "Livrée" },
  cancelled: { label: "Annulée" },
};

function AdminOrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter");

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/orders");
      if (res.status === 401 || res.status === 403) {
        router.push("/login");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
      setLoading(false);
    })();
  }, [router]);

  const isStagnant = (o) =>
    ["pending", "paid"].includes(o.status) &&
    Date.now() - new Date(o.created_at).getTime() > 3 * 24 * 60 * 60 * 1000;

  const shown = filter === "stagnant" ? orders.filter(isStagnant) : orders;
  const title = filter === "stagnant" ? "Commandes stagnantes (> 3 jours)" : "Toutes les commandes";

  const cell = { padding: "12px 16px", fontSize: "14px" };
  const th = { ...cell, textAlign: "left", fontSize: "13px", fontWeight: 600 };

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ marginBottom: "24px" }}>
        <Link href="/admin/dashboard" style={{ color: "#666", textDecoration: "none", fontSize: "14px" }}>
          ← Retour au dashboard
        </Link>
        <h1 style={{ margin: "12px 0 0", fontSize: "24px", fontWeight: 700 }}>
          {title} ({shown.length})
        </h1>
      </div>

      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#666" }}>Chargement…</div>
      ) : shown.length === 0 ? (
        <div style={{ padding: "40px", textAlign: "center", background: "#f9f9f9", borderRadius: "8px" }}>
          <p style={{ color: "#666" }}>Aucune commande trouvée</p>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: "8px", overflow: "hidden", border: "1px solid #e5e5e5" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f5f5f5", borderBottom: "1px solid #e5e5e5" }}>
                <th style={th}>ID</th>
                <th style={th}>Client</th>
                <th style={th}>Statut</th>
                <th style={{ ...th, textAlign: "right" }}>Montant</th>
                <th style={th}>Date</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((o) => (
                <tr key={o.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={cell}>#{o.id}</td>
                  <td style={cell}>
                    {o.user_name || o.customer_name || o.full_name || o.user?.full_name || "—"}
                  </td>
                  <td style={cell}>
                    <span style={{
                      display: "inline-block", padding: "4px 8px", borderRadius: "4px",
                      fontSize: "12px", fontWeight: 600,
                      background: o.status === "paid" ? "#e8f5e9" : o.status === "cancelled" ? "#fdecea" : "#fff3e0",
                      color: o.status === "paid" ? "#2e7d32" : o.status === "cancelled" ? "#c62828" : "#f57c00",
                    }}>
                      {(ORDER_STATUS[o.status] || {}).label || o.status}
                    </span>
                  </td>
                  <td style={{ ...cell, textAlign: "right", fontWeight: 600 }}>
                    {Number(o.total_amount || 0).toLocaleString("fr-FR")} FCFA
                  </td>
                  <td style={{ ...cell, color: "#666", fontSize: "13px" }}>
                    {new Date(o.created_at).toLocaleDateString("fr-FR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Chargement…</div>}>
      <AdminOrdersContent />
    </Suspense>
  );
}
