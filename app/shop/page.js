"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { addToCart, getCart, cartCount } from "@/lib/cart";
import PriceDisplay, { hasDiscount, discountPercent } from "@/app/components/PriceDisplay";
import Footer from "@/app/components/Footer";

const CONDITION_LABELS = { neuf: "Neuf", quasi_neuf: "Quasi neuf", occasion: "Occasion" };
const CONDITION_COLORS = { neuf: "var(--gold-600)", quasi_neuf: "#6b7280", occasion: "var(--bissap-600)" };
const SORT_OPTIONS = [
  { value: "newest", label: "Nouveautés" },
  { value: "price_asc", label: "Prix croissant" },
  { value: "price_desc", label: "Prix décroissant" },
  { value: "rating", label: "Mieux notés" },
];

function Stars({ rating }) {
  const rounded = Math.round(Number(rating) || 0);
  return (
    <span className="stars" aria-label={`${rating} sur 5`}>
      {"★".repeat(rounded)}
      {"☆".repeat(5 - rounded)}
    </span>
  );
}

function ProductCard({ p, onAdd, justAdded }) {
  const [favMsg, setFavMsg] = useState(false);

  function handleFav(e) {
    e.preventDefault();
    setFavMsg(true);
    setTimeout(() => setFavMsg(false), 1400);
  }

  return (
    <div className="product-card shop-card">
      <button
        className="shop-card-fav"
        onClick={handleFav}
        aria-label="Ajouter aux favoris"
        title="Ajouter aux favoris"
      >
        {favMsg ? "🔜" : "♡"}
      </button>

      <Link href={`/shop/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
        <div className="shop-card-image-wrap">
          {hasDiscount(p) && <span className="badge-discount">-{discountPercent(p)}%</span>}
          {p.isNew && <span className="shop-card-badge-new">Nouveau</span>}
          {p.images && p.images.length > 0 ? (
            <img src={p.images[0]} alt={p.name} className="shop-card-image" />
          ) : (
            <div className="shop-card-image shop-card-image-placeholder">🛍️</div>
          )}
        </div>
        <div className="name shop-card-name">{p.name}</div>
      </Link>

      <span
        className="shop-card-condition"
        style={{ background: CONDITION_COLORS[p.condition] || "var(--gold-600)" }}
      >
        {CONDITION_LABELS[p.condition] || "Neuf"}
      </span>

      <div className="shop">{p.shop_name}</div>

      {Number(p.review_count) > 0 && (
        <div className="shop-card-rating">
          <Stars rating={p.avg_rating} />
          <span className="shop-card-rating-count">({p.review_count})</span>
        </div>
      )}

      <PriceDisplay product={p} />

      <button
        className="btn btn-primary"
        onClick={() => onAdd(p)}
        disabled={p.stock_quantity <= 0}
      >
        {p.stock_quantity <= 0
          ? "Rupture de stock"
          : justAdded === p.id
          ? "Ajouté ✓"
          : "Ajouter au panier"}
      </button>
    </div>
  );
}

function FilterSidebar({
  categories,
  shops,
  categorySlug,
  shopId,
  condition,
  minPrice,
  maxPrice,
  onCategoryPick,
  onShopChange,
  onConditionPick,
  minPriceInput,
  maxPriceInput,
  setMinPriceInput,
  setMaxPriceInput,
  onApplyPrice,
}) {
  return (
    <>
      <div className="sidebar-section">
        <h3>Catégories</h3>
        <div className="sidebar-cat-list">
          <button
            className={`sidebar-cat-link ${!categorySlug ? "active" : ""}`}
            onClick={() => onCategoryPick("")}
          >
            Toutes les catégories
          </button>
          {categories.map((cat) => (
            <div key={cat.id}>
              <button
                className={`sidebar-cat-link ${categorySlug === cat.slug ? "active" : ""}`}
                onClick={() => onCategoryPick(cat.slug)}
              >
                {cat.emoji} {cat.name}
              </button>
              {cat.children?.map((sub) => (
                <button
                  key={sub.id}
                  className={`sidebar-cat-link sidebar-cat-link-sub ${categorySlug === sub.slug ? "active" : ""}`}
                  onClick={() => onCategoryPick(sub.slug)}
                >
                  {sub.name}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="sidebar-section">
        <h3>Prix (FCFA)</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="number"
            min="0"
            placeholder="Min"
            value={minPriceInput}
            onChange={(e) => setMinPriceInput(e.target.value)}
          />
          <input
            type="number"
            min="0"
            placeholder="Max"
            value={maxPriceInput}
            onChange={(e) => setMaxPriceInput(e.target.value)}
          />
        </div>
        <button className="btn btn-ghost" style={{ width: "100%", marginTop: 8 }} onClick={onApplyPrice}>
          Appliquer
        </button>
      </div>

      <div className="sidebar-section">
        <h3>État</h3>
        <div className="sidebar-cat-list">
          <button
            className={`sidebar-cat-link ${!condition ? "active" : ""}`}
            onClick={() => onConditionPick("")}
          >
            Tous les états
          </button>
          {Object.entries(CONDITION_LABELS).map(([key, label]) => (
            <button
              key={key}
              className={`sidebar-cat-link ${condition === key ? "active" : ""}`}
              onClick={() => onConditionPick(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar-section">
        <h3>Boutique</h3>
        <select value={shopId} onChange={(e) => onShopChange(e.target.value)}>
          <option value="">Toutes les boutiques</option>
          {shops.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
    </>
  );
}

function ShopContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const categorySlug = searchParams.get("category") || "";
  const shopId = searchParams.get("shopId") || "";
  const condition = searchParams.get("condition") || "";
  const sort = searchParams.get("sort") || "newest";
  const q = searchParams.get("q") || "";
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";

  const [products, setProducts] = useState([]);
  const [shops, setShops] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [justAdded, setJustAdded] = useState(null);
  const [user, setUser] = useState(null);
  const [userChecked, setUserChecked] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [searchInput, setSearchInput] = useState(q);
  const [minPriceInput, setMinPriceInput] = useState(minPrice);
  const [maxPriceInput, setMaxPriceInput] = useState(maxPrice);

  useEffect(() => {
    fetch("/api/shops").then((r) => r.json()).then((d) => setShops(d.shops || []));
    fetch("/api/categories").then((r) => r.json()).then((d) => setCategories(d.categories || []));
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setUser(d.user || null);
        setUserChecked(true);
      });
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (categorySlug) params.set("category", categorySlug);
    if (q) params.set("q", q);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (shopId) params.set("shopId", shopId);
    if (condition) params.set("condition", condition);
    if (sort) params.set("sort", sort);

    fetch(`/api/products?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setProducts(data.products || []);
        setLoading(false);
      });
    setCount(cartCount(getCart()));
  }, [categorySlug, q, minPrice, maxPrice, shopId, condition, sort]);

  function updateParams(patch) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(patch).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    router.push(`/shop?${params.toString()}`);
    setMobileFiltersOpen(false);
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    updateParams({ q: searchInput });
  }

  function handleAdd(product) {
    addToCart(product);
    setCount(cartCount(getCart()));
    setJustAdded(product.id);
    setTimeout(() => setJustAdded(null), 1200);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
  }

  function accountLink() {
    if (!user) return "/login";
    if (user.role === "vendor") return "/vendor/dashboard";
    if (user.role === "admin") return "/admin/dashboard";
    return "/orders";
  }

  const sidebarProps = {
    categories,
    shops,
    categorySlug,
    shopId,
    condition,
    minPrice,
    maxPrice,
    onCategoryPick: (slug) => updateParams({ category: slug }),
    onShopChange: (id) => updateParams({ shopId: id }),
    onConditionPick: (val) => updateParams({ condition: val }),
    minPriceInput,
    maxPriceInput,
    setMinPriceInput,
    setMaxPriceInput,
    onApplyPrice: () => updateParams({ minPrice: minPriceInput, maxPrice: maxPriceInput }),
  };

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/" className="brand" style={{ textDecoration: "none" }}>
          🛒 FasoShop
        </Link>
        <div className="topbar-actions">
          <Link href="/devenir-vendeur"><button>Devenir vendeur</button></Link>
          {userChecked && user ? (
            <>
              <Link href={accountLink()}><button>Bonjour, {user.full_name?.split(" ")[0]}</button></Link>
              <button onClick={handleLogout}>Déconnexion</button>
            </>
          ) : (
            <Link href="/login"><button>Se connecter</button></Link>
          )}
        </div>
      </div>
      <div className="woven-strip" />

      {/* Catégories en défilement horizontal — mobile uniquement */}
      <div className="shop-mobile-cats">
        <button
          className={`category-pill ${!categorySlug ? "active-pill" : ""}`}
          onClick={() => updateParams({ category: "" })}
        >
          Tout
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`category-pill ${categorySlug === cat.slug ? "active-pill" : ""}`}
            onClick={() => updateParams({ category: cat.slug })}
          >
            {cat.emoji} {cat.name}
          </button>
        ))}
      </div>

      <div className="shop-layout">
        <aside className="shop-sidebar">
          <FilterSidebar {...sidebarProps} />
        </aside>

        <div className="shop-main">
          <div className="page-header" style={{ marginBottom: 12 }}>
            <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input
                type="text"
                placeholder="Rechercher un produit..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn btn-primary">Rechercher</button>
            </form>
          </div>

          <div className="shop-toolbar">
            <span className="shop-result-count">
              {loading ? "Chargement..." : `${products.length} produit${products.length > 1 ? "s" : ""}`}
            </span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                className="btn btn-ghost shop-mobile-filter-btn"
                onClick={() => setMobileFiltersOpen(true)}
              >
                ⚙ Filtres
              </button>
              <select value={sort} onChange={(e) => updateParams({ sort: e.target.value })} style={{ width: "auto" }}>
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <p>Chargement...</p>
          ) : products.length === 0 ? (
            <div className="empty-state">
              <div className="glyph">🛍️</div>
              <p>Aucun produit ne correspond à votre recherche.</p>
            </div>
          ) : (
            <div className="shop-grid">
              {products.map((p) => (
                <ProductCard key={p.id} p={p} onAdd={handleAdd} justAdded={justAdded} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Panneau de filtres coulissant — mobile uniquement */}
      {mobileFiltersOpen && (
        <div className="shop-filter-overlay" onClick={() => setMobileFiltersOpen(false)}>
          <div className="shop-filter-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="shop-filter-drawer-head">
              <strong>Filtres</strong>
              <button className="btn btn-ghost" onClick={() => setMobileFiltersOpen(false)}>Fermer ✕</button>
            </div>
            <FilterSidebar {...sidebarProps} />
          </div>
        </div>
      )}

      {count > 0 && (
        <Link href="/cart" className="cart-fab">
          🛒 Panier ({count})
        </Link>
      )}

      <Footer />
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="shell"><div className="content"><p>Chargement...</p></div></div>}>
      <ShopContent />
    </Suspense>
  );
}
