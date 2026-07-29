"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { addToCart, getCart, cartCount } from "@/lib/cart";
import PriceDisplay, { hasDiscount, discountPercent } from "@/app/components/PriceDisplay";
import Footer from "@/app/components/Footer";

function ShopContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const categorySlug = searchParams.get("category");

  const [products, setProducts] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [justAdded, setJustAdded] = useState(null);
  const [categoryLabel, setCategoryLabel] = useState(null);
  const [user, setUser] = useState(null);
  const [userChecked, setUserChecked] = useState(false);

  const [searchInput, setSearchInput] = useState(searchParams.get("q") || "");
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") || "");
  const [shopId, setShopId] = useState(searchParams.get("shopId") || "");

  useEffect(() => {
    fetch("/api/shops")
      .then((r) => r.json())
      .then((d) => setShops(d.shops || []));
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
    if (searchParams.get("q")) params.set("q", searchParams.get("q"));
    if (searchParams.get("minPrice")) params.set("minPrice", searchParams.get("minPrice"));
    if (searchParams.get("maxPrice")) params.set("maxPrice", searchParams.get("maxPrice"));
    if (searchParams.get("shopId")) params.set("shopId", searchParams.get("shopId"));

    fetch(`/api/products?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setProducts(data.products || []);
        setLoading(false);
        if (data.products?.length && categorySlug) {
          setCategoryLabel(data.products[0].category_name || null);
        } else if (!categorySlug) {
          setCategoryLabel(null);
        }
      });
    setCount(cartCount(getCart()));
  }, [searchParams, categorySlug]);

  function applyFilters(overrides = {}) {
    const params = new URLSearchParams();
    if (categorySlug) params.set("category", categorySlug);

    const q = overrides.q !== undefined ? overrides.q : searchInput;
    const min = overrides.minPrice !== undefined ? overrides.minPrice : minPrice;
    const max = overrides.maxPrice !== undefined ? overrides.maxPrice : maxPrice;
    const sid = overrides.shopId !== undefined ? overrides.shopId : shopId;

    if (q) params.set("q", q);
    if (min) params.set("minPrice", min);
    if (max) params.set("maxPrice", max);
    if (sid) params.set("shopId", sid);

    router.push(`/shop?${params.toString()}`);
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    applyFilters({ q: searchInput });
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

      <div className="content">
        <div className="page-header">
          <h1>{categorySlug ? categoryLabel || "Catalogue" : "Catalogue"}</h1>
          <p>
            {categorySlug
              ? "Produits filtrés par catégorie."
              : "Des produits vendus par des boutiques locales, partout au Burkina Faso."}
          </p>
          {categorySlug && (
            <Link href="/shop" style={{ fontSize: "0.85rem", color: "var(--gold-600)" }}>
              ← Voir tout le catalogue
            </Link>
          )}
        </div>

        <div className="panel">
          <form onSubmit={handleSearchSubmit} className="form-row" style={{ alignItems: "flex-end" }}>
            <div style={{ flex: 2 }}>
              <label htmlFor="search-q">Rechercher</label>
              <input
                id="search-q"
                type="text"
                placeholder="Nom du produit..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="min-price">Prix min (FCFA)</label>
              <input
                id="min-price"
                type="number"
                min="0"
                placeholder="0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="max-price">Prix max (FCFA)</label>
              <input
                id="max-price"
                type="number"
                min="0"
                placeholder="Aucun"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="shop-filter">Boutique</label>
              <select
                id="shop-filter"
                value={shopId}
                onChange={(e) => setShopId(e.target.value)}
              >
                <option value="">Toutes les boutiques</option>
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <button
                type="submit"
                className="btn btn-primary"
                onClick={() => applyFilters({ q: searchInput, minPrice, maxPrice, shopId })}
              >
                Filtrer
              </button>
            </div>
          </form>
        </div>

        {loading ? (
          <p>Chargement...</p>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <div className="glyph">🛍️</div>
            <p>Aucun produit ne correspond à votre recherche.</p>
          </div>
        ) : (
          <div className="product-grid">
            {products.map((p) => (
              <div className="product-card" key={p.id}>
                {hasDiscount(p) && (
                  <span className="badge-discount">-{discountPercent(p)}%</span>
                )}
                <Link href={`/shop/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  {p.images && p.images.length > 0 ? (
                    <img
                      src={p.images[0]}
                      alt={p.name}
                      style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", borderRadius: 6, marginBottom: 8 }}
                    />
                  ) : (
                    <div style={{ width: "100%", aspectRatio: "1 / 1", background: "var(--sand-100)", borderRadius: 6, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>
                      🛍️
                    </div>
                  )}
                  <div className="name">{p.name}</div>
                </Link>
                <div className="shop">{p.shop_name}</div>
                <PriceDisplay product={p} />
                <button
                  className="btn btn-primary"
                  onClick={() => handleAdd(p)}
                  disabled={p.stock_quantity <= 0}
                >
                  {p.stock_quantity <= 0
                    ? "Rupture de stock"
                    : justAdded === p.id
                    ? "Ajouté ✓"
                    : "Ajouter au panier"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

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
