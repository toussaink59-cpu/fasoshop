import sql from "@/lib/db";
import { sendMail } from "@/lib/email";

// PATCH /api/admin/shops/[id]
// Change le statut d'une boutique. Réservé aux admins (vérifié par middleware.js).
// body: { status: "active" | "suspended" | "pending" | "rejected", rejectionReason? }
// Si status === "rejected", rejectionReason est requis.
// Envoie une notification (email stub pour l'instant) au vendeur lors d'une
// validation ou d'un rejet.
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

    // Notifier le vendeur (email stub tant que Resend n'est pas configuré)
    if (status === "active" || status === "rejected") {
      const [vendor] = await sql`
        SELECT email, full_name FROM users WHERE id = ${shop.vendor_id}
      `;
      if (vendor) {
        if (status === "active") {
          await sendMail({
            to: vendor.email,
            subject: "Votre boutique FasoShop a été validée",
            text: `Bonjour ${vendor.full_name},\n\nVotre boutique "${shop.name}" a été vérifiée et validée. Vous pouvez maintenant publier vos produits sur FasoShop.\n\nL'équipe FasoShop`,
          });
        } else {
          await sendMail({
            to: vendor.email,
            subject: "Votre demande de compte vendeur FasoShop n'a pas été validée",
            text: `Bonjour ${vendor.full_name},\n\nVotre demande de compte vendeur pour la boutique "${shop.name}" n'a pas pu être validée.\nMotif : ${shop.rejection_reason}\n\nVous pouvez corriger les informations et nous contacter pour une nouvelle vérification.\n\nL'équipe FasoShop`,
          });
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
