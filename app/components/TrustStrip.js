import {
  ShieldCheckIcon,
  BadgeCheckIcon,
  TruckIcon,
  HeadphonesIcon,
} from "@/app/components/Icons";

const ITEMS = [
  {
    Icon: ShieldCheckIcon,
    title: "Paiement sécurisé",
    desc: "Argent protégé jusqu'à la livraison",
  },
  {
    Icon: BadgeCheckIcon,
    title: "Vendeurs vérifiés",
    desc: "Boutiques contrôlées par Kimoxa",
  },
  {
    Icon: TruckIcon,
    title: "Livraison rapide",
    desc: "Domicile ou retrait en boutique",
  },
  {
    Icon: HeadphonesIcon,
    title: "Support 7j/7",
    desc: "WhatsApp et messagerie intégrée",
  },
];

export default function TrustStrip() {
  return (
    <div className="trust-strip-wrap">
      <style>{`
        .trust-strip-wrap {
          width: 100% !important;
          margin: 0 !important;
          padding: 4px 0 !important;
          background: transparent !important;
          border: 0 !important;
          border-radius: 0 !important;
          overflow: hidden !important;
        }

        .trust-strip {
          display: flex !important;
          width: 100% !important;
          gap: 0 !important;
          padding: 0 10px !important;
          background: transparent !important;
          border: 0 !important;
          overflow-x: auto !important;
          overflow-y: hidden !important;
          scrollbar-width: none !important;
          -webkit-overflow-scrolling: touch;
        }

        .trust-strip::-webkit-scrollbar {
          display: none !important;
        }

        .trust-item {
          flex: 0 0 178px !important;
          width: 178px !important;
          min-width: 178px !important;
          height: 52px !important;
          box-sizing: border-box !important;
          padding: 5px 10px !important;
          margin: 0 !important;
          display: flex !important;
          flex-direction: row !important;
          align-items: center !important;
          gap: 8px !important;
          text-align: left !important;
          background: transparent !important;
          border: 0 !important;
          border-radius: 0 !important;
        }

        .trust-item + .trust-item {
          border-left: 1px solid rgba(36, 23, 18, 0.10) !important;
        }

        .trust-item-icon {
          width: 29px !important;
          height: 29px !important;
          min-width: 29px !important;
          flex: 0 0 29px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          border-radius: 8px !important;
          background: var(--sand-100, #f3efe7) !important;
          color: var(--gold-600, #d4af37) !important;
        }

        .trust-item-text {
          min-width: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 2px !important;
        }

        .trust-item-title {
          margin: 0 !important;
          padding: 0 !important;
          color: #0d1220 !important;
          font-size: 0.72rem !important;
          font-weight: 700 !important;
          line-height: 1.15 !important;
          white-space: nowrap !important;
        }

        .trust-item-desc {
          margin: 0 !important;
          padding: 0 !important;
          color: #6f665f !important;
          font-size: 0.61rem !important;
          line-height: 1.2 !important;
          display: -webkit-box !important;
          -webkit-box-orient: vertical !important;
          -webkit-line-clamp: 2 !important;
          overflow: hidden !important;
        }

        @media (max-width: 359px) {
          .trust-item {
            flex-basis: 166px !important;
            width: 166px !important;
            min-width: 166px !important;
            padding-left: 8px !important;
            padding-right: 8px !important;
          }

          .trust-item-title {
            font-size: 0.68rem !important;
          }

          .trust-item-desc {
            font-size: 0.58rem !important;
          }
        }

        @media (min-width: 768px) {
          .trust-strip-wrap {
            padding: 6px 16px !important;
          }

          .trust-strip {
            display: grid !important;
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            gap: 8px !important;
            padding: 0 !important;
            overflow: visible !important;
          }

          .trust-item {
            width: auto !important;
            min-width: 0 !important;
            flex: none !important;
            height: 52px !important;
          }
        }
      `}</style>

      <div className="trust-strip" aria-label="Garanties KIMOXA">
        {ITEMS.map((it) => (
          <div className="trust-item" key={it.title}>
            <span className="trust-item-icon" aria-hidden="true">
              <it.Icon size={18} />
            </span>
            <div className="trust-item-text">
              <p className="trust-item-title">{it.title}</p>
              <p className="trust-item-desc">{it.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
