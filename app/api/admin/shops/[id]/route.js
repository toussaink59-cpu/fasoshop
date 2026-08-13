import sql from "@/lib/db";
import { sendMail, emailTemplates } from "@/lib/email";

// PATCH /api/admin/shops/[id]
// Change le statut d'une boutique. Réservé aux admins (vérifié par middleware.js).
// body: { status: "active" | "suspended" | "pending" | "rejected", rejectionReason? }
// Si status === "rejected", rejectionReason est requis.
// Envoie une notification HTML au vendeur lors d'une validation ou d'un rejet.
export async function PATCH(request, { params }) {
  const { id } = await params;

  try {
    const { status, rejectionReason } = await request.json();

    const allowedStatuses = ["active", "suspended", "pending", "rejected"];
    if (!allowedStatuses.includes(status)) {
      return Response.json(
        { error: "Statut invalide. Utilisez active, suspended, pending ou rejected." },
        { status: 400 }
      );
    }

    if (status === "rejected" && (!rejectionReason || !rejectionReason.trim())) {
      return Response.json(
        { error: "Un motif de rejet est requis." },
        { status: 400 }
      );
    }

    const [shop] = await sql`
      UPDATE shops
      SET status = ${status},
          rejection_reason = ${status === "rejected" ? rejectionReason.trim() : null},
          verified_at = CASE WHEN ${status} IN ('active', 'rejected') THEN NOW()::timestamp ELSE verified_at END
      WHERE id = ${id}
      RETURNING id, name, status, vendor_id, rejection_reason
    `;

    if (!shop) {
      return Response.json({ error: "Boutique introuvable." }, { status: 404 });
    }

    // 📧 Notifier le vendeur avec templates HTML professionnels
    if (status === "active" || status === "rejected") {
      const [vendor] = await sql`
        SELECT email, full_name FROM users WHERE id = ${shop.vendor_id}
      `;
      if (vendor?.email) {
        try {
          if (status === "active") {
            const tpl = emailTemplates.shopApproved({
              shopName: shop.name,
              ownerName: vendor.full_name,
            });
            await sendMail({
              to: vendor.email,
              subject: tpl.subject,
              html: tpl.html,
            });
          } else {
            const tpl = emailTemplates.shopRejected({
              shopName: shop.name,
              ownerName: vendor.full_name,
              reason: shop.rejection_reason,
            });
            await sendMail({
              to: vendor.email,
              subject: tpl.subject,
              html: tpl.html,
            });
          }
        } catch (emailErr) {
          // Non bloquant : l'email échoue mais la boutique est quand même mise à jour
          console.error("[admin/shops] Email non envoyé:", emailErr.message);
        }
      }
    }

    return Response.json({ shop });
  } catch (err) {
    console.error("Erreur mise à jour statut boutique:", err);
    return Response.json(
      { error: "Erreur serveur lors de la mise à jour du statut." },
      { status: 500 }
    );
  }
}