import sql from "@/lib/db";
import { adminGuard } from "@/lib/adminAuth";

// GET /api/admin/export?kind=orders|shops|payouts
// Export CSV — séparateur « ; » + BOM UTF-8 (compatible Excel FR)
export async function GET(request) {
  const guardError = adminGuard(request);
  if (guardError) return guardError;

  const userId = request.headers.get("x-user-id");
  const [user] = await sql`SELECT role FROM users WHERE id = ${userId}`;
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }

  const kind = new URL(request.url).searchParams.get("kind");
  const today = new Date().toISOString().slice(0, 10);
  const filename = `kimoxa-${kind}-${today}.csv`;

  let headers = [];
  let rows = [];

  if (kind === "orders") {
    headers = ["ID", "Date", "Acheteur", "Email", "Total (FCFA)", "Statut"];
    const data = await sql`
      SELECT o.id, o.created_at, u.full_name AS buyer, u.email,
             COALESCE(SUM(l.gross_amount), 0) AS total_amount,
             o.status
      FROM orders o
      JOIN users u ON u.id = o.buyer_id
      LEFT JOIN shop_commission_ledger l ON l.order_id = o.id
      GROUP BY o.id, o.created_at, u.full_name, u.email, o.status
      ORDER BY o.created_at DESC
      LIMIT 5000
    `;
    rows = data.map((r) => [
      r.id,
      new Date(r.created_at).toLocaleString("fr-FR"),
      r.buyer,
      r.email,
      Number(r.total_amount),
      r.status,
    ]);
  } else if (kind === "shops") {
    headers = ["ID", "Boutique", "Vendeur", "Email", "Statut", "CA brut (FCFA)", "Commissions (FCFA)"];
    const data = await sql`
      SELECT s.id, s.name, u.full_name AS vendor, u.email, s.status,
        COALESCE((SELECT SUM(l.gross_amount) FROM shop_commission_ledger l WHERE l.shop_id = s.id), 0) AS ca,
        COALESCE((SELECT SUM(l.commission_amount) FROM shop_commission_ledger l WHERE l.shop_id = s.id), 0) AS comm
      FROM shops s
      JOIN users u ON u.id = s.vendor_id
      ORDER BY s.id
    `;
    rows = data.map((r) => [r.id, r.name, r.vendor, r.email, r.status, Number(r.ca), Number(r.comm)]);
  } else if (kind === "payouts") {
    headers = ["Commande", "Boutique", "Brut (FCFA)", "Commission (FCFA)", "Net vendeur (FCFA)", "Statut payout", "Livraison", "Libéré le"];
    const data = await sql`
      SELECT l.order_id, s.name, l.gross_amount, l.commission_amount,
             l.payout_status, l.delivery_status, l.payout_released_at
      FROM shop_commission_ledger l
      JOIN shops s ON s.id = l.shop_id
      ORDER BY l.order_id DESC
      LIMIT 5000
    `;
    rows = data.map((r) => [
      r.order_id,
      r.name,
      Number(r.gross_amount),
      Number(r.commission_amount),
      Number(r.gross_amount) - Number(r.commission_amount),
      r.payout_status,
      r.delivery_status,
      r.payout_released_at ? new Date(r.payout_released_at).toLocaleString("fr-FR") : "",
    ]);
  } else {
    return Response.json({ error: "Type d'export inconnu. Valeurs : orders, shops, payouts." }, { status: 400 });
  }

  // Échappement CSV robuste (guillemets, ;, retours ligne)
  const esc = (v) => {
    const s = String(v ?? "");
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = "\uFEFF" + [headers, ...rows].map((row) => row.map(esc).join(";")).join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}