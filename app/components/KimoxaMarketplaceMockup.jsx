 "use client";

import { useState } from "react";

const products = [
  {
    name: "Tissu Wax Premium",
    price: "8 500 FCFA",
    image: "/images/products/wax.jpg",
    rating: 4.8,
  },
  {
    name: "Sac Artisanal",
    price: "12 000 FCFA",
    image: "/images/products/bag.jpg",
    rating: 4.9,
  },
  {
    name: "Casque Audio",
    price: "18 500 FCFA",
    image: "/images/products/headphones.jpg",
    rating: 4.7,
  },
  {
    name: "Plante Décorative",
    price: "6 500 FCFA",
    image: "/images/products/plant.jpg",
    rating: 4.8,
  },
];

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 16l4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5h2l1.4 9.2a2 2 0 0 0 2 1.7h7.8a2 2 0 0 0 1.9-1.5L21 8H7"
        fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="19" r="1.3" />
      <circle cx="18" cy="19" r="1.3" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.3" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5.5 19a6.5 6.5 0 0 1 13 0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function KimoxaMarketplaceMockup() {
  const [mobileNav, setMobileNav] = useState(false);

  return (
    <main className="kimoxa-shell">
      <style jsx global>{`
        :root {
          --kmx-black: #0d1220;
          --kmx-black-2: #121828;
          --kmx-cream: #f4efe6;
          --kmx-cream-2: #faf7f1;
          --kmx-gold: #d4af37;
          --kmx-orange: #e8590c;
          --kmx-brown: #241712;
          --kmx-green: #2e7d32;
          --kmx-muted: #7d776f;
          --kmx-border: #ddd7cd;
          --kmx-radius: 14px;
          --kmx-shadow: 0 16px 45px rgba(13, 18, 32, 0.12);
        }

        * {
          box-sizing: border-box;
        }

        .kimoxa-shell {
          min-height: 100vh;
          background:
            radial-gradient(circle at 50% -10%, rgba(212, 175, 55, 0.06), transparent 28%),
            var(--kmx-cream-2);
          color: var(--kmx-brown);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .kmx-topbar {
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 0 32px;
          background: var(--kmx-black);
          color: #fff;
        }

        .kmx-brand {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          color: #fff;
          text-decoration: none;
          min-width: max-content;
        }

        .kmx-brand img {
          width: 28px;
          height: 28px;
          object-fit: contain;
          border-radius: 6px;
        }

        .kmx-brand strong {
          font-size: 14px;
          letter-spacing: 0.22em;
          font-weight: 800;
        }

        .kmx-search-wrap {
          flex: 1;
          max-width: 540px;
          position: relative;
        }

        .kmx-search {
          width: 100%;
          height: 32px;
          border: 0;
          border-radius: 5px;
          outline: 0;
          padding: 0 38px 0 12px;
          font-size: 11px;
          color: var(--kmx-brown);
          background: #fff;
        }

        .kmx-search-icon {
          position: absolute;
          right: 10px;
          top: 50%;
          width: 16px;
          height: 16px;
          transform: translateY(-50%);
          color: #5a5a5a;
          pointer-events: none;
        }

        .kmx-actions {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .kmx-action-btn {
          border: 0;
          background: transparent;
          color: #fff;
          cursor: pointer;
          display: grid;
          place-items: center;
          width: 24px;
          height: 24px;
        }

        .kmx-action-btn svg {
          width: 18px;
          height: 18px;
        }

        .kmx-nav {
          position: relative;
          z-index: 10;
          background: var(--kmx-black-2);
          color: #fff;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .kmx-nav-inner {
          height: 42px;
          padding: 0 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 28px;
        }

        .kmx-nav-link {
          color: rgba(255, 255, 255, 0.76);
          text-decoration: none;
          font-size: 10px;
          font-weight: 600;
          white-space: nowrap;
          transition: color 0.2s ease;
        }

        .kmx-nav-link:hover {
          color: #fff;
        }

        .kmx-menu-btn {
          display: none;
          border: 0;
          background: transparent;
          color: #fff;
          cursor: pointer;
          width: 34px;
          height: 34px;
        }

        .kmx-hero {
          max-width: 1200px;
          margin: 0 auto;
          padding: 44px 32px 26px;
          display: grid;
          grid-template-columns: 0.88fr 1.12fr;
          align-items: center;
          gap: 38px;
        }

        .kmx-hero-copy {
          padding: 8px 0 8px 20px;
        }

        .kmx-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.16em;
          color: var(--kmx-orange);
        }

        .kmx-eyebrow-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--kmx-orange);
          box-shadow: 0 0 0 5px rgba(232, 89, 12, 0.08);
        }

        .kmx-hero h1 {
          margin: 0;
          max-width: 430px;
          color: var(--kmx-brown);
          font-size: clamp(36px, 4vw, 58px);
          line-height: 0.98;
          letter-spacing: -0.045em;
          font-weight: 900;
        }

        .kmx-hero h1 span {
          color: var(--kmx-gold);
        }

        .kmx-hero p {
          max-width: 420px;
          margin: 16px 0 20px;
          color: #685f57;
          font-size: 14px;
          line-height: 1.6;
        }

        .kmx-primary {
          border: 0;
          border-radius: 9px;
          background: var(--kmx-gold);
          color: var(--kmx-brown);
          font-size: 12px;
          font-weight: 900;
          padding: 12px 18px;
          cursor: pointer;
          box-shadow: 0 10px 22px rgba(212, 175, 55, 0.18);
        }

        .kmx-hero-trust {
          display: flex;
          gap: 18px;
          flex-wrap: wrap;
          margin-top: 20px;
          color: #7b736a;
          font-size: 10px;
          font-weight: 700;
        }

        .kmx-hero-trust span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .kmx-hero-trust i {
          width: 17px;
          height: 17px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #efe3b7;
          color: var(--kmx-green);
          font-style: normal;
          font-size: 10px;
        }

        .kmx-hero-visual {
          position: relative;
          min-height: 360px;
          border-radius: 22px;
          overflow: hidden;
          background: #d9c4a1;
          box-shadow: var(--kmx-shadow);
        }

        .kmx-hero-visual::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(13, 18, 32, 0.04), rgba(13, 18, 32, 0.12));
          pointer-events: none;
        }

        .kmx-hero-image {
          width: 100%;
          height: 100%;
          min-height: 360px;
          object-fit: cover;
          object-position: center;
          display: block;
        }

        .kmx-section {
          max-width: 1200px;
          margin: 0 auto;
          padding: 16px 32px 56px;
        }

        .kmx-section-head {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 15px;
        }

        .kmx-section-head h2 {
          margin: 0;
          font-size: 18px;
          letter-spacing: -0.02em;
          color: var(--kmx-brown);
        }

        .kmx-section-head a {
          color: var(--kmx-orange);
          font-size: 11px;
          font-weight: 800;
          text-decoration: none;
        }

        .kmx-products {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .kmx-card {
          border: 1px solid var(--kmx-border);
          background: #fff;
          border-radius: 13px;
          overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .kmx-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 30px rgba(36, 23, 18, 0.08);
        }

        .kmx-card-img-wrap {
          height: 160px;
          background: #f0ece5;
          overflow: hidden;
        }

        .kmx-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .kmx-card-body {
          padding: 11px 11px 12px;
        }

        .kmx-card-name {
          margin: 0;
          font-size: 12px;
          font-weight: 800;
          color: var(--kmx-brown);
        }

        .kmx-card-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 7px;
        }

        .kmx-price {
          color: var(--kmx-orange);
          font-size: 12px;
          font-weight: 900;
        }

        .kmx-rating {
          font-size: 10px;
          color: #877f75;
          white-space: nowrap;
        }

        .kmx-woven {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 32px 20px;
        }

        .kmx-woven-line {
          height: 6px;
          border-radius: 999px;
          background:
            repeating-linear-gradient(
              90deg,
              var(--kmx-gold) 0 28px,
              var(--kmx-orange) 28px 56px,
              var(--kmx-brown) 56px 82px,
              #8f1f2f 82px 108px
            );
          opacity: 0.9;
        }

        @media (max-width: 900px) {
          .kmx-hero {
            grid-template-columns: 1fr;
            padding-top: 28px;
          }

          .kmx-hero-copy {
            padding-left: 0;
          }

          .kmx-hero-visual,
          .kmx-hero-image {
            min-height: 300px;
          }

          .kmx-products {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .kmx-topbar {
            height: 52px;
            padding: 0 15px;
          }

          .kmx-search-wrap {
            max-width: none;
          }

          .kmx-brand strong {
            display: none;
          }

          .kmx-nav-inner {
            height: auto;
            min-height: 42px;
            padding: 0 15px;
            justify-content: space-between;
          }

          .kmx-menu-btn {
            display: grid;
            place-items: center;
          }

          .kmx-nav-links {
            display: none;
          }

          .kmx-nav-links.open {
            display: flex;
            position: absolute;
            left: 0;
            right: 0;
            top: 42px;
            padding: 10px 15px 14px;
            background: var(--kmx-black-2);
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
            border-top: 1px solid rgba(255,255,255,0.06);
          }

          .kmx-hero {
            padding: 26px 15px 18px;
          }

          .kmx-hero h1 {
            font-size: 40px;
          }

          .kmx-section {
            padding: 12px 15px 42px;
          }

          .kmx-woven {
            padding: 0 15px 16px;
          }

          .kmx-products {
            gap: 10px;
          }

          .kmx-card-img-wrap {
            height: 145px;
          }
        }
      `}</style>

      <header className="kmx-topbar">
        <a className="kmx-brand" href="/">
          <img src="/icon-512.png" alt="KIMOXA" />
          <strong>KIMOXA</strong>
        </a>

        <div className="kmx-search-wrap">
          <input
            className="kmx-search"
            type="search"
            placeholder="Rechercher un produit, une marque..."
            aria-label="Rechercher"
          />
          <span className="kmx-search-icon"><SearchIcon /></span>
        </div>

        <div className="kmx-actions">
          <button className="kmx-action-btn" type="button" aria-label="Panier">
            <CartIcon />
          </button>
          <button className="kmx-action-btn" type="button" aria-label="Compte">
            <UserIcon />
          </button>
        </div>
      </header>

      <nav className="kmx-nav">
        <div className="kmx-nav-inner">
          <button
            className="kmx-menu-btn"
            type="button"
            aria-label="Ouvrir le menu"
            aria-expanded={mobileNav}
            onClick={() => setMobileNav((v) => !v)}
          >
            <MenuIcon />
          </button>

          <div className={`kmx-nav-links ${mobileNav ? "open" : ""}`}>
            <a href="#" className="kmx-nav-link">Toutes catégories</a>
            <a href="#" className="kmx-nav-link">Accueil</a>
            <a href="#" className="kmx-nav-link">Catégories</a>
            <a href="#" className="kmx-nav-link">Boutiques</a>
            <a href="#" className="kmx-nav-link">Promoteurs</a>
            <a href="#" className="kmx-nav-link">Nos vendeurs</a>
          </div>
        </div>
      </nav>

      <section className="kmx-hero">
        <div className="kmx-hero-copy">
          <div className="kmx-eyebrow">
            <span className="kmx-eyebrow-dot" />
            La marketplace locale nouvelle génération
          </div>

          <h1>
            Soutenons nos<br />
            <span>vendeurs locaux.</span>
          </h1>

          <p>
            Découvrez des produits sélectionnés auprès de commerçants
            du Burkina Faso et achetez en ligne avec une expérience simple,
            moderne et rassurante.
          </p>

          <button className="kmx-primary" type="button">
            Découvrir
          </button>

          <div className="kmx-hero-trust">
            <span><i>✓</i> Paiement sécurisé</span>
            <span><i>✓</i> Livraison locale</span>
            <span><i>✓</i> Vendeurs vérifiés</span>
          </div>
        </div>

        <div className="kmx-hero-visual">
          <img
            className="kmx-hero-image"
            src="/images/hero-vendeuse.jpg"
            alt="Commerçante KIMOXA présentant sa boutique"
          />
        </div>
      </section>

      <section className="kmx-section">
        <div className="kmx-section-head">
          <h2>Meilleures ventes</h2>
          <a href="#">Voir tout</a>
        </div>

        <div className="kmx-products">
          {products.map((product) => (
            <article className="kmx-card" key={product.name}>
              <div className="kmx-card-img-wrap">
                <img src={product.image} alt={product.name} loading="lazy" />
              </div>

              <div className="kmx-card-body">
                <h3 className="kmx-card-name">{product.name}</h3>

                <div className="kmx-card-meta">
                  <span className="kmx-price">{product.price}</span>
                  <span className="kmx-rating">★ {product.rating}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="kmx-woven" aria-hidden="true">
        <div className="kmx-woven-line" />
      </div>
    </main>
  );
}
