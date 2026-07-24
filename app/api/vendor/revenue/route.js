import sql from "@/lib/db";

// GET /api/vendor/revenue
// Calcule les revenus de la boutique du vendeur connecté :
// ventes brutes, commission totale, montant net dû, montant déjà versé.
export async function GET(request) {
  const userId = request.headers.get("x-user-id");

  const [shop] = await sql`
    SELECT id FROM shops WHERE vendor_id = ${userId} LIMIT 1
  `;

  if (!shop) {
    return Response.json({ error: "Aucune boutique associée à ce compte." }, { status: 404 });
  }

  const [totals] = await sql`
    SELECT
      COALESCE(SUM(gross_amount), 0)::float AS gross_sales,
      COALESCE(SUM(commission_amount), 0)::float AS total_commission,
      COALESCE(SUM(gross_amount - commission_amount) FILTER (WHERE status = 'due'), 0)::float AS net_amount_due,
      COALESCE(SUM(gross_amount - commission_amount) FILTER (WHERE status = 'settled'), 0)::float AS net_amount_settled,
      COUNT(*)::int AS order_count
    FROM shop_commission_ledger
    WHERE shop_id = ${shop.id}
  `;

  return Response.json({
    revenue: {
      grossSales: totals.gross_sales,
      totalCommission: totals.total_commission,
      netAmountDue: totals.net_amount_due,
      netAmountSettled: totals.net_amount_settled,
      orderCount: totals.order_count,
    },
  });
}
