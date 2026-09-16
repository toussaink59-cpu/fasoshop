"use client";

// app/admin/orders/page.js — RÉÉCRITURE PRO
// Design system : app/dashboard.css (à importer ici).
// API inchangée : GET /api/admin/orders?page=&limit=25&filter=stagnant

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShoppingCartIcon, ArrowRightIcon } from "@/app/components/Icons";
import KimoxaLogo from "@/app/components/KimoxaLogo";
import "../../dashboard.css";

const ORDER_STATUS = {
  pending:     { label: "En attente",     cls: "status-pending" },
  paid:        { label: "Payée",          cls: "status-paid" },
  preparation: { label: "En préparation", cls: "status-preparation" },
  shipped:     { label: "Expédiée",       cls: "status-shipped" },
  delivered:   { label: "Livrée",         cls: "status-delivered" },
  cancelled:   { label: "Annulée",        cls: "status-cancelled" },
};

const fmtAmount = (n) => `${Number(n || 0).toLocaleString("fr-FR")} FCFA`;
const fmtDate = (d) =>
  new Date(d).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });

function AdminOrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stagnantOnly = searchParams.get("filter") === "stagnant";

  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadOrders = useCallback(async (p) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: "25" });
    if (stagnantOnly) params.set("filter", "stagnant");
    const res = await fetch("/api/admin/orders?" + params.toString());
    if (res.status === 401 || res.status === 403) { router.push("/login"); return; }
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders || []);
      setPagination(data.pagination || null);
    }
    setLoading(false);
  }, [router, stagnantOnly]);

  useEffect(() => { loadOrders(page); }, [page, loadOrders]);
  useEffect(() => { setPage(1); }, [stagnantOnly]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (!q) return true;
      return (
        String(o.id).includes(q) ||
        String(o.buyer_name || "").toLowerCase().includes(q) ||
        String(o.buyer_email || "").toLowerCase().includes(q)
      );
    });
  }, [orders, query, statusFilter]);

  const total = pagination ? pagination.total : orders.length;

  return (
    <div>
      <div className="dash-topbar">
        <div className="dash-topbar-brand">
          <KimoxaLogo light size={20} />
          <span className="dash-topbar-role">Admin</span>
        </div>
        <div className="dash-topbar-actions">
          <Link href="/admin/dashboard" className="tb-link">Dashboard</Link>
        </div>
      </div>
      <div className="woven-strip" />
      <div className="dash-wrap">
        <div className="dash-head">
        <div>
          <Link href="/admin/dashboard" style={{ color: "var(--text-muted)", textDecoration: "none", fontSize: "0.85rem" }}>
            ← Retour au dashboard
          </Link>
          <h1 className="dash-title" style={{ marginTop: 8 }}>
            {stagnantOnly ? "Commandes stagnantes (> 3 jours)" : "Commandes"} ({total.toLocaleString("fr-FR")})
          </h1>
          <p className="dash-sub">Toutes les boutiques · 25 par page · export CSV depuis le dashboard</p>
        </div>
      </div>

      <div className="dash-toolbar">
        <input
          className="dash-search"
          type="search"
          placeholder="Rechercher par n° de commande, client, e-mail…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className="dash-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">Tous les statuts</option>
          {Object.entries(ORDER_STATUS).map(([key, s]) => (
            <option key={key} value={key}>{s.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className="skeleton" />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="empty-block">
          <ShoppingCartIcon size={48} />
          <p>Aucune commande {query || statusFilter !== "all" ? "correspondant aux filtres" : "pour l'instant"}.</p>
        </div>
      ) : (
        <div className="pro-table-wrap">
          <table className="pro-table">
            <thead>
              <tr>
                <th>N°</th>
                <th>Client</th>
                <th>Statut</th>
                <th style={{ textAlign: "right" }}>Montant</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((o) => {
                const st = ORDER_STATUS[o.status] || { label: o.status, cls: "status-pending" };
                return (
                  <tr key={o.id}>
                    <td className="cell-main">#{o.id}</td>
                    <td>
                      <span className="cell-main">{o.buyer_name || "—"}</span>
                      {o.buyer_email && <span className="cell-muted" style={{ display: "block" }}>{o.buyer_email}</span>}
                    </td>
                    <td><span className={`status-pill ${st.cls}`}>{st.label}</span></td>
                    <td className="amount">{fmtAmount(o.total_amount)}</td>
                    <td className="cell-muted">{fmtDate(o.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pagination && (pagination.totalPages || 0) > 1 && (
        <div className="pager">
          <button className="btn btn-ghost btn-sm" disabled={!pagination.hasPrev || loading} onClick={() => setPage(page - 1)}>
            ← Précédent
          </button>
          <span className="pager-info">
            Page {pagination.page} / {pagination.totalPages} · {total.toLocaleString("fr-FR")} commandes
          </span>
          <button className="btn btn-ghost btn-sm" disabled={!pagination.hasNext || loading} onClick={() => setPage(page + 1)}>
            Suivant <ArrowRightIcon size={14} style={{ marginLeft: 4 }} />
          </button>
        </div>
      )}
      </div>
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<div className="dash-wrap"><div className="skeleton" /></div>}>
      <AdminOrdersContent />
    </Suspense>
  );
}