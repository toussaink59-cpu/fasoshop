import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getInvoiceData } from "@/lib/queries/invoice";
import KimoxaLogo from "@/app/components/KimoxaLogo";
import PrintButton from "@/app/components/PrintButton";
import Link from "next/link";

export const metadata = {
  title: "Facture",
};

const STATUS_LABELS = {
  preparation: "En préparation",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
};

export default async function InvoicePage({ params }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const invoice = await getInvoiceData(id, user.id);
  if (!invoice) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <p>Facture introuvable ou accès non autorisé.</p>
        <Link href="/orders">← Retour aux commandes</Link>
      </div>
    );
  }

  const date = new Date(invoice.created_at).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // ===== CALCUL LIVRAISON =====
  const deliveryFee = Number(invoice.deliveryFee) || 0;
  const subtotalProducts = Number(invoice.total) - deliveryFee;

  return (
    <div>
      {/* Bouton imprimer (masqué à l'impression) */}
      <div className="invoice-toolbar print-hide">
        <Link href="/orders" className="btn btn-ghost">← Retour aux commandes</Link>
        <PrintButton />
      </div>

      <div className="invoice-sheet">
        {/* En-tête facture */}
        <div className="invoice-header">
          <div className="invoice-brand">
            <KimoxaLogo size={32} />
          </div>
          <div className="invoice-title">
            <h1>FACTURE</h1>
            <div className="invoice-number">N° {String(invoice.id).padStart(6, "0")}</div>
            <div className="invoice-date">{date}</div>
          </div>
        </div>

        {/* Bloc client */}
        <div className="invoice-section">
          <h2>Client</h2>
          <div className="invoice-info">
            <div><strong>{invoice.buyer_name}</strong></div>
            <div>📍 {invoice.shipping_address}</div>
            <div>📞 {invoice.phone || invoice.buyer_phone}</div>
            {invoice.buyer_email && <div>✉️ {invoice.buyer_email}</div>}
          </div>
        </div>

        {/* Blocs par boutique (identité réelle obligatoire) */}
        {invoice.subOrders.map((sub) => (
          <div className="invoice-section" key={sub.shopId}>
            <div className="invoice-vendor-header">
              <div>
                <h2>Vendu par</h2>
                <div className="invoice-info">
                  <div><strong>{sub.shopName}</strong></div>
                  <div>Responsable : {sub.vendorName}</div>
                  {sub.vendorPhone && <div>📞 {sub.vendorPhone}</div>}
                  {sub.shopCity && <div>📍 {sub.shopCity}, Burkina Faso</div>}
                </div>
              </div>
              <div className="invoice-status">
                <span className={`status-pill status-${sub.deliveryStatus}`}>
                  {STATUS_LABELS[sub.deliveryStatus] || sub.deliveryStatus}
                </span>
              </div>
            </div>

            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Article</th>
                  <th className="text-right">Qté</th>
                  <th className="text-right">Prix unitaire</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {sub.items.map((item, idx) => {
                  const lineTotal = item.quantity * item.priceAtPurchase;
                  return (
                    <tr key={idx}>
                      <td>{item.productName}</td>
                      <td className="text-right">{item.quantity}</td>
                      <td className="text-right">
                        {item.priceAtPurchase.toLocaleString("fr-FR")} FCFA
                      </td>
                      <td className="text-right">
                        <strong>{lineTotal.toLocaleString("fr-FR")} FCFA</strong>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="text-right"><strong>Sous-total boutique</strong></td>
                  <td className="text-right"><strong>{sub.subtotal.toLocaleString("fr-FR")} FCFA</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ))}

        {/* ===== TOTAL GÉNÉRAL AVEC LIVRAISON ===== */}
        <div className="invoice-total">
          {/* Sous-total produits */}
          <div className="invoice-total-row">
            <span>Sous-total produits</span>
            <span>{subtotalProducts.toLocaleString("fr-FR")} FCFA</span>
          </div>

          {/* Frais de livraison */}
          <div className="invoice-total-row">
            <span>🚚 Livraison</span>
            <span style={{ color: deliveryFee === 0 ? "var(--millet-600)" : "inherit", fontWeight: deliveryFee === 0 ? 700 : 400 }}>
              {deliveryFee === 0 ? "Gratuite 🎉" : `${deliveryFee.toLocaleString("fr-FR")} FCFA`}
            </span>
          </div>

          {/* Total payé */}
          <div className="invoice-total-row">
            <span><strong>Total payé</strong></span>
            <strong>{Number(invoice.total).toLocaleString("fr-FR")} FCFA</strong>
          </div>

          {/* Mode de paiement */}
          <div className="invoice-total-row invoice-payment">
            <span>Mode de paiement</span>
            <span>
              {invoice.payment_method === "mobile_money" ? "📱 Mobile Money" : "💵 Paiement à la livraison"}
            </span>
          </div>
        </div>

        {/* Mention légale */}
        <div className="invoice-legal">
          <p><strong>Kimoxa</strong> — Marketplace multi-vendeurs · Burkina Faso</p>
          <p>
            Kimoxa agit en tant qu'intermédiaire de paiement sécurisé (séquestre).
            Conformément à la législation en vigueur sur le commerce électronique,
            l'identité réelle du vendeur professionnel est mentionnée sur cette facture.
          </p>
          <p>En cas de litige, contactez le support Kimoxa : support@kimoxa.bf</p>
        </div>
      </div>
    </div>
  );
}