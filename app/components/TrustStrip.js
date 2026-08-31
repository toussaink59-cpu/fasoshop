import { ShieldCheckIcon, BadgeCheckIcon, TruckIcon, HeadphonesIcon } from "@/app/components/Icons";

const ITEMS = [
  { Icon: ShieldCheckIcon, title: "Paiement sécurisé", desc: "Argent protégé jusqu'à la livraison" },
  { Icon: BadgeCheckIcon, title: "Vendeurs vérifiés", desc: "Boutiques contrôlées par Kimoxa" },
  { Icon: TruckIcon, title: "Livraison rapide", desc: "Domicile ou retrait en boutique" },
  { Icon: HeadphonesIcon, title: "Support 7j/7", desc: "WhatsApp et messagerie intégrée" },
];

export default function TrustStrip() {
  return (
    <div className="trust-strip-wrap">
      <style>{`
        .trust-strip-wrap { padding: 10px 16px; }
        .trust-strip { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        .trust-item { display: flex; gap: 10px; align-items: flex-start; background: #fff; border: 1px solid var(--border, #e5e2d9); border-radius: 14px; padding: 12px; }
        .trust-item-icon { width: 38px; height: 38px; border-radius: 10px; background: var(--sand-100, #f3efe7); color: var(--gold-600, #d4af37); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .trust-item-title { font-size: .8rem; font-weight: 700; color: var(--ink-900, #241712); margin: 0 0 2px; }
        .trust-item-desc { font-size: .7rem; color: var(--ink-400, #8a7f75); margin: 0; line-height: 1.35; }
        @media (min-width: 768px) { .trust-strip-wrap { padding: 12px 24px; } .trust-strip { grid-template-columns: repeat(4, 1fr); } }
      `}</style>
      <div className="trust-strip">
        {ITEMS.map((it) => (
          <div className="trust-item" key={it.title}>
            <span className="trust-item-icon"><it.Icon size={20} /></span>
            <div>
              <p className="trust-item-title">{it.title}</p>
              <p className="trust-item-desc">{it.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
