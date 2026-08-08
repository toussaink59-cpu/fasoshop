"use client";

import { useState, useMemo } from "react";
import ProductCard from "@/app/components/ProductCard";

const PAGE = 6;

// Flux de produits façon Temu : on reste sur la même page,
// le bouton "Afficher plus" charge 6 produits supplémentaires.
// Les produits déjà affichés dans les sections vitrine (Flash, Nouveautés)
// sont automatiquement exclus pour éviter les doublons.
export default function HomeFeed({ initialProducts = [], user, excludeIds = new Set() }) {
  // Filtre les produits déjà vus dans les sections vitrine
  const filteredProducts = useMemo(
    () => initialProducts.filter((p) => !excludeIds.has(p.id)),
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
      <div className="shop-grid">
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
            <p className="load-more-done">✓ Vous avez vu tous les produits</p>
          </div>
        )
      )}
    </div>
  );
}
