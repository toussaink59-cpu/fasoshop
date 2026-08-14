import sql from "@/lib/db";

// POST /api/orders/[id]/confirm-receipt
// Le CLIENT confirme la réception → statut "delivered" + DÉBLOCAGE du payout vendeur.
// CORRIGÉ P0 : verifications strictes, idempotence, transaction, audit log.
// body: { shopId }
export async function POST(request, { params }) {
  const userId = request.headers.get("x-user-id");
  const userRole = request.headers.get("x-user-role");
  const { id: orderId } = await params;

  if (!userId) {
    return Response.json({ error: "Authentification requise." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const shopId = Number(body.shopId);

    if (!Number.isInteger(shopId) || shopId <= 0) {
      return Response.json({ error: "shopId invalide." }, { status: 400 });
    }

    const result = await sql.begin(async (tx) => {
      const [order] = await tx`
        SELECT id, buyer_id, status FROM orders WHERE id = ${orderId}
      `;

      if (!order) {
        return { error: "Commande introuvable.", status: 404 };
      }

      if (String(order.buyer_id) !== String(userId) && userRole !== "admin") {
        return { error: "Accès refusé.", status: 403 };
      }

      if (order.status === "cancelled") {
        return { error: "Commande annulée, confirmation impossible.", status: 400 };
      }
      if (order.status === "pending") {
        return { error: "Commande en attente de paiement.", status: 400 };
      }

      // Vérifie que shopId appartient bien à cette commande
      const [shopInOrder] = await tx`
        SELECT DISTINCT oi.product_id
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = ${orderId} AND p.shop_id = ${shopId}
        LIMIT 1
      `;

      if (!shopInOrder) {
        return { error: "Cette boutique n'appartient pas à cette commande.", status: 403 };
      }

      // Machine à états + idempotence
      const [updated] = await tx`
        UPDATE shop_commission_ledger
        SET delivery_status = 'delivered',
            payout_status = 'released',
            payout_released_at = NOW()
        WHERE order_id = ${orderId}
          AND shop_id = ${shopId}
          AND delivery_status = 'shipped'
          AND payout_status = 'held'
        RETURNING id, delivery_status, payout_status
      `;

      if (!updated) {
        const [ledger] = await tx`
          SELECT delivery_status, payout_status FROM shop_commission_ledger
          WHERE order_id = ${orderId} AND shop_id = ${shopId}
        `;

        if (!ledger) {
          return { error: "Sous-commande introuvable.", status: 404 };
        }
        if (ledger.delivery_status === "delivered" && ledger.payout_status === "released") {
          return { error: "Payout déjà libéré.", status: 409 };
        }
        if (ledger.delivery_status === "preparation") {
          return { error: "Le vendeur n'a pas encore expédié la commande.", status: 400 };
        }
        if (ledger.payout_status !== "held") {
          return { error: "Payout dans un état incompatible.", status: 400 };
        }
        return { error: "État de livraison invalide.", status: 400 };
      }

      // Audit log
      await tx`
        INSERT INTO security_audit_log (user_id, action, resource_type, resource_id, ip_address)
        VALUES (${userId}, 'confirm_receipt', 'order', ${orderId}, ${request.headers.get("x-forwarded-for") || "unknown"})
      `.catch(() => {});

      return { ok: true, ledger: updated };
    });

    if (result.error) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json(result);
  } catch (err) {
    console.error("Erreur confirmation réception:", err);
    return Response.json({ error: "Erreur serveur." }, { status: 500 });
  }
}