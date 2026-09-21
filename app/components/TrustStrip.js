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
        /* Audit KIMOXA - correctif ALN-5.
           Sur mobile, les 4 encarts étaient disposés en icône à gauche +
           texte à droite dans des cellules d'environ 150 px : il restait
           moins de 100 px pour le texte, qui partait sur 2 ou 3 lignes
           selon la longueur du libellé. Les titres et les descriptions ne
           tombaient donc jamais à la même hauteur d'une cellule à l'autre,
           d'où l'aspect désordonné.

           Disposition retenue : icône centrée au-dessus du texte sur
           mobile (les 4 encarts deviennent symétriques deux à deux), et
           retour à la disposition horizontale à partir de 768 px, où la
           largeur disponible la rend lisible. Les cellules d'une même
           rangée partagent la même hauteur (étirement de la grille) et le
           contenu est centré verticalement, si bien que tout est aligné
           quelle que soit la longueur des textes. */
        .trust-strip-wrap { padding: 10px 16px; }
        .trust-strip { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; align-items: stretch; }
        .trust-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          text-align: center;
          gap: 8px;
          height: 100%;
          box-sizing: border-box;
          background: #fff;
          border: 1px solid var(--border, #e5e2d9);
          border-radius: 14px;
          padding: 14px 10px;
        }
        .trust-item-icon { width: 38px; height: 38px; border-radius: 10px; background: var(--sand-100, #f3efe7); color: var(--gold-600, #d4af37); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .trust-item-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .trust-item-title { font-size: .8rem; font-weight: 700; color: var(--ink-900, #241712); margin: 0; line-height: 1.25; }
        .trust-item-desc { font-size: .7rem; color: var(--ink-400, #8a7f75); margin: 0; line-height: 1.35; }

        /* Écrans très étroits (Galaxy Z Fold plié, ~369 px) : on resserre
           sans jamais déborder. */
        @media (max-width: 359px) {
          .trust-strip { gap: 8px; }
          .trust-item { padding: 12px 8px; }
          .trust-item-desc { font-size: .66rem; }
        }

        @media (min-width: 768px) {
          .trust-strip-wrap { padding: 12px 24px; }
          .trust-strip { grid-template-columns: repeat(4, 1fr); }
          .trust-item { flex-direction: row; align-items: center; justify-content: flex-start; text-align: left; gap: 10px; padding: 12px; }
        }
      `}</style>
      <div className="trust-strip">
        {ITEMS.map((it) => (
          <div className="trust-item" key={it.title}>
            <span className="trust-item-icon"><it.Icon size={20} /></span>
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
