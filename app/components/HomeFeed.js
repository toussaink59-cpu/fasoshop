"use client";

import { useState } from "react";
import ProductCard from "@/app/components/ProductCard";

const PAGE = 6;

// Flux de produits façon Temu : on reste sur la même page,
// le bouton "Afficher plus" charge 6 produits supplémentaires.
export default function HomeFeed({ initialProducts = [], user }) {
  const [visibleCount, setVisibleCount] = useState(PAGE);
  const [loadingMore, setLoadingMore] = useState(false);

  const remaining = initialProducts.length - visibleCount;
  const hasMore = remaining > 0;
  const visible = initialProducts.slice(0, visibleCount);

  function handleLoadMore() {
    setLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((c) => c + PAGE);
      setLoadingMore(false);
    }, 350);
  }

  if (initialProducts.length === 0) return null;

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
        initialProducts.length > PAGE && (
          <div className="load-more-wrap">
            <p className="load-more-done">✓ Vous avez vu tous les produits</p>
          </div>
        )
      )}
    </div>
  );
}
