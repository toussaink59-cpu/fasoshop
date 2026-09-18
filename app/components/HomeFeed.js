"use client";

import { CheckIcon } from "@/app/components/Icons";
import { useState, useMemo } from "react";
import ProductCard, { isPurchasable } from "@/app/components/ProductCard";

const PAGE = 6;

// Flux de produits façon Temu : on reste sur la même page,
// le bouton "Afficher plus" charge 6 produits supplémentaires.
// Les produits déjà affichés dans les sections vitrine (Flash, Nouveautés)
// sont automatiquement exclus pour éviter les doublons.
export default function HomeFeed({ initialProducts = [], user, excludeIds = new Set() }) {
  // Filtre les produits déjà vus dans les sections vitrine ET ceux en rupture
  // de stock (ProductCard ne les rend pas) pour que "N produits restants"
  // corresponde toujours au nombre réel de cartes affichées.
  // Audit KIMOXA - correctif UX-1.
  const filteredProducts = useMemo(
    () => initialProducts.filter((p) => !excludeIds.has(p.id) && isPurchasable(p)),
    [initialProducts, excludeIds]
  );

  const [visibleCount, setVisibleCount] = useState(PAGE);
  const [loadingMore, setLoadingMore] = useState(false);

  const remaining = filteredProducts.length - visibleCount;
  const hasMore = remaining > 0;
  const visible = filteredProducts.slice(0, visibleCount);

  function handleLoadMore() {
    setLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((c) => c + PAGE);
      setLoadingMore(false);
    }, 350);
  }

  if (filteredProducts.length === 0) return null;

  return (
    <div className="home-section">
      {/* Audit KIMOXA - correctif R-2/R-3 : la page d'accueil utilisait
          .shop-grid (5 colonnes fixes dès 1024px) alors que le catalogue
          utilise .temu-shop-grid (2→3→4→5→6 colonnes selon 5 paliers).
          Deux systèmes de grille différents pour le même type de contenu
          donnaient une densité de cartes incohérente entre les deux pages.
          Unification sur .temu-shop-grid, déjà utilisé par ShopClient.js,
          pour un rendu identique et un seul système à maintenir. */}
      <div className="temu-shop-grid">
        {visible.map((p) => (
          <ProductCard key={p.id} p={p} user={user} />
        ))}
      </div>

      {hasMore ? (
        <div className="load-more-wrap">
          <button
            className="btn-load-more"
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? (
              "Chargement..."
            ) : (
              <>↓ Afficher plus</>
            )}
          </button>
          <p className="load-more-count">
            {remaining} produit{remaining > 1 ? "s" : ""} restant{remaining > 1 ? "s" : ""}
          </p>
        </div>
      ) : (
        filteredProducts.length > PAGE && (
          <div className="load-more-wrap">
            <p className="load-more-done" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><CheckIcon size={16} style={{ color: "var(--millet-600)" }} /> Vous avez vu tous les produits</p>
          </div>
        )
      )}
    </div>
  );
}
