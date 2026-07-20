import sql from "@/lib/db";
import { initiatePayment } from "@/lib/cinetpay";

// POST /api/orders/[id]/pay
// Initie un paiement CinetPay pour une commande "mobile_money" déjà créée.
export async function POST(request, { params }) {
  const userId = request.headers.get("x-user-id");
  const { id: orderId } = await params;

  try {
    const [order] = await sql`
      SELECT id, buyer_id, total, status, payment_method, phone
      FROM orders
      WHERE id = ${orderId}
    `;

    if (!order || String(order.buyer_id) !== String(userId)) {
      return Response.json({ error: "Commande introuvable." }, { status: 404 });
    }
    if (order.payment_method !== "mobile_money") {
      return Response.json(
        { error: "Cette commande n'est pas configurée pour un paiement en ligne." },
        { status: 400 }
      );
    }
    if (order.status !== "pending") {
      return Response.json(
        { error: "Cette commande a déjà été traitée." },
        { status: 400 }
      );
    }

    // Nouveau transaction_id à chaque tentative, comme exigé par CinetPay
    const transactionId = `FASO${order.id}-${Date.now()}`;
    const baseUrl = process.env.APP_BASE_URL || new URL(request.url).origin;

    const { paymentUrl } = await initiatePayment({
      transactionId,
      amount: order.total,
      description: `Commande FasoShop #${order.id}`,
      customerPhoneNumber: order.phone,
      notifyUrl: `${baseUrl}/api/payments/cinetpay/webhook`,
      returnUrl: `${baseUrl}/orders?confirmed=${order.id}`,
    });

    await sql`
      INSERT INTO payments (order_id, transaction_id, status, amount)
      VALUES (${order.id}, ${transactionId}, 'initiated', ${order.total})
    `;

    return Response.json({ paymentUrl });
  } catch (err) {
    console.error("Erreur initiation paiement:", err);
    return Response.json(
      { error: err.message || "Erreur lors de l'initiation du paiement." },
      { status: 500 }
    );
  }
}