import { SmartphoneIcon, BanknoteIcon, StoreIcon, BadgeCheckIcon, TruckIcon, PartyPopperIcon } from "@/app/components/Icons";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getInvoiceData } from "@/lib/queries/invoice";
import KimoxaLogo from "@/app/components/KimoxaLogo";
import PrintButton from "@/app/components/PrintButton";
import Link from "next/link";
import "./invoice.css";

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

  const deliveryFee = Number(invoice.deliveryFee) || 0;
  const subtotalProducts = Number(invoice.total) - deliveryFee;

  return (
    <div>
      {/* Toolbar (masqué à l'impression) */}
      <div className="invoice-toolbar print-hide">
        <Link href="/orders" className="btn btn-ghost">← Retour aux commandes</Link>
        <PrintButton />
      </div>

      {/* Feuille facture A4 compacte */}
      <div className="invoice-sheet">

        {/* ═══════════ EN-TÊTE ═══════════ */}
        <div className="invoice-header">
          <div className="invoice-header-left">
            <KimoxaLogo size={36} />
            <div className="invoice-tagline">Achetez local. Vivez grand.</div>
          </div>
          <div className="invoice-header-right">
            <div className="invoice-title-text">FACTURE</div>
            <div className="invoice-number-text">
              N° <strong>KMX-{String(invoice.id).padStart(6, "0")}</strong>
            </div>
            <div className="invoice-date-text">{date}</div>
          </div>
        </div>

        {/* ═══════════ CLIENT + STATUT GLOBAL (2 colonnes) ═══════════ */}
        <div className="invoice-meta-row">
          <div className="invoice-meta-block">
            <div className="invoice-meta-label">FACTURÉ À</div>
            <div className="invoice-meta-value">
              <strong>{invoice.buyer_name}</strong>
            </div>
            <div className="invoice-meta-detail">{invoice.shipping_address}</div>
            <div className="invoice-meta-detail">{invoice.phone || invoice.buyer_phone}</div>
            {invoice.buyer_email && (
              <div className="invoice-meta-detail">{invoice.buyer_email}</div>
            )}
          </div>

          <div className="invoice-meta-block">
            <div className="invoice-meta-label">PAIEMENT</div>
            <div className="invoice-meta-value">
              {invoice.payment_method === "mobile_money" ? <><SmartphoneIcon size={14} style={{ display: "inline-flex", marginRight: 4 }} /> Mobile Money</> : <><BanknoteIcon size={14} style={{ display: "inline-flex", marginRight: 4 }} /> À la réception</>}
            </div>
            <div className="invoice-meta-detail">
              Statut : <strong style={{ color: invoice.total > 0 ? "var(--millet-600)" : "var(--ink-600)" }}>
                {invoice.total > 0 ? "Confirmé" : "En attente"}
              </strong>
            </div>
            <div className="invoice-meta-detail">
              {invoice.subOrders.length} boutique{invoice.subOrders.length > 1 ? "s" : ""}
            </div>
          </div>
        </div>

        {/* ═══════════ BLOCS PAR BOUTIQUE ═══════════ */}
        {invoice.subOrders.map((sub, shopIndex) => (
          <div
            key={sub.shopId}
            className="invoice-shop-block"
            style={{ marginTop: shopIndex === 0 ? 0 : 18 }}
          >
            {/* En-tête boutique compact */}
            <div className="invoice-shop-header">
              <div>
                <div className="invoice-shop-label">VENDU PAR</div>
                <div className="invoice-shop-name">
                  <StoreIcon size={14} style={{ display: "inline-flex", marginRight: 6 }} />{sub.shopName} <span className="invoice-verified" style={{ display: "inline-flex" }}><BadgeCheckIcon size={14} /></span>
                </div>
                <div className="invoice-shop-info">
                  {sub.vendorName}
                  {sub.shopCity ? ` · ${sub.shopCity}, Burkina Faso` : ""}
                  {sub.vendorPhone ? ` · ${sub.vendorPhone}` : ""}
                </div>
              </div>
              <span className={`status-pill status-${sub.deliveryStatus}`}>
                {STATUS_LABELS[sub.deliveryStatus] || sub.deliveryStatus}
              </span>
            </div>

            {/* Tableau articles */}
            <table className="invoice-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Article</th>
                  <th style={{ textAlign: "right", width: 60 }}>Qté</th>
                  <th style={{ textAlign: "right", width: 110 }}>Prix unit.</th>
                  <th style={{ textAlign: "right", width: 110 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {sub.items.map((item, idx) => {
                  const lineTotal = item.quantity * item.priceAtPurchase;
                  return (
                    <tr key={idx}>
                      <td>{item.productName}</td>
                      <td style={{ textAlign: "right" }}>{item.quantity}</td>
                      <td style={{ textAlign: "right" }}>
                        {item.priceAtPurchase.toLocaleString("fr-FR")} FCFA
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>
                        {lineTotal.toLocaleString("fr-FR")} FCFA
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} style={{ textAlign: "right", fontSize: 12 }}>
                    Sous-total {sub.shopName}
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>
                    {sub.subtotal.toLocaleString("fr-FR")} FCFA
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ))}

        {/* ═══════════ TOTAL GÉNÉRAL (aligné à droite) ═══════════ */}
        <div className="invoice-totals">
          <div className="invoice-totals-row">
            <span>Sous-total produits</span>
            <span>{subtotalProducts.toLocaleString("fr-FR")} FCFA</span>
          </div>
          <div className="invoice-totals-row">
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><TruckIcon size={14} /> Livraison</span>
            <span className={deliveryFee === 0 ? "delivery-free" : ""}>
              {deliveryFee === 0 ? <span style={{ display: "flex", alignItems: "center", gap: 6 }}>Gratuite <PartyPopperIcon size={14} style={{ color: "var(--gold-600)" }} /></span> : `${deliveryFee.toLocaleString("fr-FR")} FCFA`}
            </span>
          </div>
          <div className="invoice-totals-row invoice-totals-grand">
            <span>TOTAL PAYÉ</span>
            <span>{Number(invoice.total).toLocaleString("fr-FR")} FCFA</span>
          </div>
        </div>

        {/* ═══════════ MENTION LÉGALE COMPACTE ═══════════ */}
        <div className="invoice-legal">
          <div className="invoice-legal-header">
            <strong>Kimoxa</strong> — Marketplace multi-vendeurs · Burkina Faso
          </div>
          <p>
            Kimoxa agit en tant qu'intermédiaire de paiement sécurisé (séquestre).
            L'identité réelle du vendeur professionnel est mentionnée sur cette facture
            conformément à la législation sur le commerce électronique.
          </p>
          <div className="invoice-legal-contact">
            Support : <strong>support@kimoxa.bf</strong>
          </div>
          <div className="invoice-legal-footer">
            Merci pour votre confiance.
          </div>
        </div>
      </div>
    </div>
  );
}