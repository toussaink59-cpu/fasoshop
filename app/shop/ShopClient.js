"use client";

import { useState, useEffect, useRef, Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Footer from "@/app/components/Footer";
import SiteHeader from "@/app/components/SiteHeader";
import BottomNav from "@/app/components/BottomNav";
import ProductCard from "@/app/components/ProductCard";

const CONDITION_LABELS = { neuf: "Neuf", quasi_neuf: "Quasi neuf", occasion: "Occasion" };
const SORT_OPTIONS = [
  { value: "newest", label: "✨ Nouveautés" },
  { value: "price_asc", label: "↑ Prix croissant" },
  { value: "price_desc", label: "↓ Prix décroissant" },
  { value: "rating", label: "★ Mieux notés" },
];
const ITEMS_PER_PAGE = 24;

// Villes principales du Burkina Faso (pour « près de chez moi »)
const BF_CITIES = [
  { name: "Ouagadougou", lat: 12.3714, lon: -1.5197 },
  { name: "Bobo-Dioulasso", lat: 11.1773, lon: -4.2979 },
  { name: "Koudougou", lat: 12.2541, lon: -2.3616 },
  { name: "Ouahigouya", lat: 13.5828, lon: -2.4219 },
  { name: "Banfora", lat: 10.6333, lon: -4.75 },
  { name: "Dédougou", lat: 12.4667, lon: -3.4667 },
  { name: "Fada N'Gourma", lat: 12.0614, lon: 0.3581 },
  { name: "Gaoua", lat: 10.3167, lon: -3.1833 },
  { name: "Dori", lat: 14.0356, lon: -0.0347 },
  { name: "Kaya", lat: 13.0833, lon: -1.0833 },
  { name: "Tenkodogo", lat: 11.7833, lon: -0.3667 },
  { name: "Ziniaré", lat: 12.5833, lon: -1.4 },
];

function nearestCity(lat, lon) {
  let best = null;
  let bestD = Infinity;
  for (const c of BF_CITIES) {
    const d = (c.lat - lat) ** 2 + (c.lon - lon) ** 2;
    if (d < bestD) {
      bestD = d;
      best = c.name;
    }
  }
  return best;
}

// ====== SHEET DE FILTRES (mobile + desktop, façon Temu) ======
// Anonymat Option B : PAS de filtre boutique.
// « Ville » devient « 📍 Près de chez moi » (côté acheteur, pas vendeur).
function FilterSheet({
  open,
  onClose,
  onApply,
  onReset,
  categories,
  brands,
  cities,
  filters,
  setFilters,
}) {
  const [detecting, setDetecting] = useState(false);
  const [locMsg, setLocMsg] = useState("");

  const allCities = useMemo(() => {
    const set = new Set([...cities, ...BF_CITIES.map((c) => c.name)]);
    return [...set].sort((a, b) => a.localeCompare(b, "fr"));
  }, [cities]);

  function handleDetectLocation() {
    setLocMsg("");
    if (!navigator.geolocation) {
      setLocMsg("Géolocalisation non supportée. Choisissez votre ville manuellement.");
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const city = nearestCity(pos.coords.latitude, pos.coords.longitude);
        setFilters((f) => ({ ...f, city }));
        setDetecting(false);
        setLocMsg(`✅ Ville détectée : ${city}`);
      },
      () => {
        setDetecting(false);
        setLocMsg("Position introuvable. Choisissez votre ville manuellement.");
      },
      { timeout: 8000 }
    );
  }

  if (!open) return null;

  return (
    <div className="temu-sheet-overlay" onClick={onClose}>
      <div className="temu-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="temu-sheet-head">
          <h2>Filtres</h2>
          <button className="temu-sheet-close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <div className="temu-sheet-body">
          {/* Catégories */}
          <section className="temu-filter-section">
            <h3>Catégories</h3>
            <div className="temu-chip-group">
              <button
                className={`temu-chip ${!filters.categorySlug ? "is-active" : ""}`}
                onClick={() => setFilters((f) => ({ ...f, categorySlug: "" }))}
              >
                Toutes
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  className={`temu-chip ${filters.categorySlug === cat.slug ? "is-active" : ""}`}
                  onClick={() => setFilters((f) => ({ ...f, categorySlug: cat.slug }))}
                >
                  {cat.emoji} {cat.name}
                </button>
              ))}
            </div>
          </section>

          {/* Prix */}
          <section className="temu-filter-section">
            <h3>Prix (FCFA)</h3>
            <div className="temu-price-row">
              <input
                type="number"
                min="0"
                placeholder="Min"
                value={filters.minPrice || ""}
                onChange={(e) => setFilters((f) => ({ ...f, minPrice: e.target.value }))}
              />
              <span>—</span>
              <input
                type="number"
                min="0"
                placeholder="Max"
                value={filters.maxPrice || ""}
                onChange={(e) => setFilters((f) => ({ ...f, maxPrice: e.target.value }))}
              />
            </div>
          </section>

          {/* État : inchangé — protège acheteur ET vendeur contre les litiges */}
          <section className="temu-filter-section">
            <h3>État</h3>
            <div className="temu-chip-group">
              <button
                className={`temu-chip ${!filters.condition ? "is-active" : ""}`}
                onClick={() => setFilters((f) => ({ ...f, condition: "" }))}
              >
                Tous
              </button>
              {Object.entries(CONDITION_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  className={`temu-chip ${filters.condition === key ? "is-active" : ""}`}
                  onClick={() => setFilters((f) => ({ ...f, condition: key }))}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* Note minimum */}
          <section className="temu-filter-section">
            <h3>Note minimum</h3>
            <div className="temu-chip-group">
              <button
                className={`temu-chip ${!filters.minRating ? "is-active" : ""}`}
                onClick={() => setFilters((f) => ({ ...f, minRating: "" }))}
              >
                Toutes
              </button>
              {[4, 3, 2].map((n) => (
                <button
                  key={n}
                  className={`temu-chip ${filters.minRating === String(n) ? "is-active" : ""}`}
                  onClick={() => setFilters((f) => ({ ...f, minRating: String(n) }))}
                >
                  {"★".repeat(n)} et plus
                </button>
              ))}
            </div>
          </section>

          {/* 📍 Près de chez moi (remplace l'ancien filtre Ville vendeur) */}
          <section className="temu-filter-section">
            <h3>📍 Près de chez moi</h3>
            <button
              type="button"
              className="temu-nearme-btn"
              onClick={handleDetectLocation}
              disabled={detecting}
            >
              {detecting ? "Détection en cours..." : "🎯 Détecter ma position"}
            </button>
            {locMsg && <div className="temu-nearme-msg">{locMsg}</div>}
            <div style={{ marginTop: 10 }}>
              <label htmlFor="temu-city-select" style={{ fontSize: "0.78rem", fontWeight: 600, marginBottom: 6, display: "block" }}>
                Ou choisissez votre ville
              </label>
              <select
                id="temu-city-select"
                value={filters.city || ""}
                onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
              >
                <option value="">Tout le pays</option>
                {allCities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </section>

          {/* Marque */}
          {brands.length > 0 && (
            <section className="temu-filter-section">
              <h3>Marque</h3>
              <select
                value={filters.brand || ""}
                onChange={(e) => setFilters((f) => ({ ...f, brand: e.target.value }))}
              >
                <option value="">Toutes les marques</option>
                {brands.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </section>
          )}
        </div>

        <div className="temu-sheet-foot">
          <button className="btn btn-ghost" onClick={onReset}>
            Réinitialiser
          </button>
          <button className="btn btn-primary" onClick={onApply}>
            Appliquer les filtres
          </button>
        </div>
      </div>
    </div>
  );
}

// ====== CHIPS DE FILTRES ACTIFS ======
function ActiveFilterChips({ filters, categories, onRemove }) {
  const chips = [];

  if (filters.categorySlug) {
    const cat = categories.find((c) => c.slug === filters.categorySlug);
    chips.push({
      key: "categorySlug",
      label: cat ? `${cat.emoji} ${cat.name}` : filters.categorySlug,
    });
  }
  if (filters.condition) {
    chips.push({ key: "condition", label: CONDITION_LABELS[filters.condition] || filters.condition });
  }
  if (filters.minRating) {
    chips.push({ key: "minRating", label: `${"★".repeat(Number(filters.minRating))} et plus` });
  }
  if (filters.minPrice || filters.maxPrice) {
    chips.push({
      key: "price",
      label: `${filters.minPrice || "0"} - ${filters.maxPrice || "∞"} FCFA`,
    });
  }
  if (filters.brand) chips.push({ key: "brand", label: filters.brand });
  if (filters.city) chips.push({ key: "city", label: `📍 Près de ${filters.city}` });

  if (chips.length === 0) return null;

  return (
    <div className="temu-active-filters">
      {chips.map((chip) => (
        <button
          key={chip.key}
          className="temu-active-chip"
          onClick={() => onRemove(chip.key)}
          aria-label={`Retirer le filtre ${chip.label}`}
        >
          <span>{chip.label}</span>
          <span className="temu-active-chip-x">✕</span>
        </button>
      ))}
    </div>
  );
}

function ShopContent({
  initialProducts,
  initialShops,
  initialCategories,
  initialBrands,
  initialCities,
  initialUser,
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get("q") || "";

  const [products, setProducts] = useState(initialProducts);
  const [categories] = useState(initialCategories);
  const [brands] = useState(initialBrands);
  const [cities] = useState(initialCities);
  const [user] = useState(initialUser);

  const [loading, setLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [loadingMore, setLoadingMore] = useState(false);
  const lastLoadedRef = useRef(null);

  const [draftFilters, setDraftFilters] = useState({
    categorySlug: searchParams.get("category") || "",
    condition: searchParams.get("condition") || "",
    brand: searchParams.get("brand") || "",
    city: searchParams.get("city") || "",
    minRating: searchParams.get("minRating") || "",
    minPrice: searchParams.get("minPrice") || "",
    maxPrice: searchParams.get("maxPrice") || "",
  });

  const appliedFilters = useMemo(() => ({
    categorySlug: searchParams.get("category") || "",
    condition: searchParams.get("condition") || "",
    brand: searchParams.get("brand") || "",
    city: searchParams.get("city") || "",
    minRating: searchParams.get("minRating") || "",
    minPrice: searchParams.get("minPrice") || "",
    maxPrice: searchParams.get("maxPrice") || "",
  }), [searchParams]);

  const sort = searchParams.get("sort") || "newest";

  function openSheet() {
    setDraftFilters(appliedFilters);
    setSheetOpen(true);
  }

  // 🔧 CORRECTION 1 : applyFilters — traduit la clé interne "categorySlug"
  // en paramètre URL "category" attendu par l'API et le server component
  function applyFilters() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    Object.entries(draftFilters).forEach(([key, val]) => {
      if (!val) return;
      // L'API et le server component attendent "category", pas "categorySlug"
      const paramKey = key === "categorySlug" ? "category" : key;
      params.set(paramKey, val);
    });
    if (sort) params.set("sort", sort);
    router.push(`/shop?${params.toString()}`);
    setSheetOpen(false);
  }

  function resetFilters() {
    setDraftFilters({
      categorySlug: "", condition: "", brand: "",
      city: "", minRating: "", minPrice: "", maxPrice: "",
    });
  }

  // 🔧 CORRECTION 2 : removeFilter — quand on clique sur le chip "categorySlug",
  // il faut supprimer le paramètre URL "category" (et non "categorySlug" qui n'existe pas)
  function removeFilter(key) {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "price") {
      params.delete("minPrice");
      params.delete("maxPrice");
    } else if (key === "categorySlug") {
      params.delete("category");
    } else {
      params.delete(key);
    }
    router.push(`/shop?${params.toString()}`);
  }

  function updateSort(newSort) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", newSort);
    router.push(`/shop?${params.toString()}`);
  }

  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    setLoading(true);
    setVisibleCount(ITEMS_PER_PAGE);
    const params = new URLSearchParams(searchParams.toString());
    fetch(`/api/products?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setProducts(data.products || []);
        setLoading(false);
      });
  }, [searchParams]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") setSheetOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function handleLoadMore() {
    setLoadingMore(true);
    setTimeout(() => {
      const newCount = Math.min(visibleCount + ITEMS_PER_PAGE, products.length);
      setVisibleCount(newCount);
      setLoadingMore(false);
      if (lastLoadedRef.current) {
        lastLoadedRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, 350);
  }

  const visibleProducts = products.slice(0, visibleCount);
  const hasMore = visibleCount < products.length;
  const remaining = products.length - visibleCount;
  const hasActiveFilters = Object.values(appliedFilters).some((v) => v);

  const activeCategory = appliedFilters.categorySlug
    ? categories.find((c) => c.slug === appliedFilters.categorySlug)
    : null;

  const pageTitle = q
    ? `Résultats pour « ${q} »`
    : activeCategory
    ? `${activeCategory.emoji || ""} ${activeCategory.name}`
    : "Catalogue";

  return (
    <div className="shell">
      <SiteHeader initialUser={user} categories={categories} searchValue={q} />

      {/* Pilules de catégories horizontales (sticky) */}
      <div className="temu-cat-bar">
        <button
          className={`temu-cat-pill ${!appliedFilters.categorySlug ? "is-active" : ""}`}
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("category");
            router.push(`/shop?${params.toString()}`);
          }}
        >
          Tout
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`temu-cat-pill ${appliedFilters.categorySlug === cat.slug ? "is-active" : ""}`}
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set("category", cat.slug);
              router.push(`/shop?${params.toString()}`);
            }}
          >
            <span className="temu-cat-pill-emoji">{cat.emoji}</span>
            <span>{cat.name}</span>
          </button>
        ))}
      </div>

      <div className="woven-strip" />

      <div className="temu-shop-wrap">
        <div className="temu-shop-title-row">
          <h1>{pageTitle}</h1>
        </div>

        <div className="temu-shop-toolbar">
          <span className="temu-result-count">
            {loading ? "Chargement..." : `${products.length} produit${products.length > 1 ? "s" : ""}`}
          </span>
          <div className="temu-toolbar-actions">
            <select
              className="temu-sort-select"
              value={sort}
              onChange={(e) => updateSort(e.target.value)}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button className="temu-filter-btn" onClick={openSheet}>
              <span>⚙</span>
              <span>Filtres</span>
              {hasActiveFilters && <span className="temu-filter-dot" />}
            </button>
          </div>
        </div>

        <ActiveFilterChips
          filters={appliedFilters}
          categories={categories}
          onRemove={removeFilter}
        />

        {loading ? (
          <div className="temu-loading">
            <div className="temu-loading-spinner" />
            <p>Chargement des produits...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <div className="glyph">🛍️</div>
            <p>Aucun produit ne correspond à votre recherche.</p>
            <button className="btn btn-ghost" onClick={() => router.push("/shop")}>
              Voir tous les produits
            </button>
          </div>
        ) : (
          <>
            <div className="temu-shop-grid">
              {visibleProducts.map((p, idx) => (
                <div key={p.id} ref={idx === visibleCount - 1 ? lastLoadedRef : null}>
                  <ProductCard p={p} user={user} />
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="load-more-wrap">
                <button
                  className="btn-load-more"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <span className="load-more-spinner">↓</span>
                  ) : (
                    <span className="load-more-icon">↓</span>
                  )}
                  {loadingMore ? "Chargement..." : `Afficher plus (${remaining})`}
                </button>
              </div>
            )}

            {!hasMore && products.length > ITEMS_PER_PAGE && (
              <div className="load-more-wrap">
                <p className="load-more-done">
                  ✓ Vous avez vu tous les {products.length} produits
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onApply={applyFilters}
        onReset={resetFilters}
        categories={categories}
        brands={brands}
        cities={cities}
        filters={draftFilters}
        setFilters={setDraftFilters}
      />

      <Footer />
      <BottomNav user={user} />
    </div>
  );
}

export default function ShopClient(props) {
  return (
    <Suspense fallback={<div className="shell"><div className="content"><p>Chargement...</p></div></div>}>
      <ShopContent {...props} />
    </Suspense>
  );
}
