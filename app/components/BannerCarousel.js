"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./BannerCarousel.module.css";

const STORY_SLIDES = [
  { id: 1, tag: "Notre vision", title: "Né en Afrique, pensé pour l’Afrique.", subtitle: "Kimoxa connecte l’Afrique qui vend à l’Afrique qui achète.", description: "Une marketplace multi-vendeurs conçue pour rendre le commerce local plus accessible et plus structuré.", primaryLabel: "Découvrir le catalogue", primaryHref: "/shop", secondaryLabel: "Découvrir Kimoxa", secondaryHref: "/", visual: "vision" },
  { id: 2, tag: "Catalogue public", title: "Voir ce qui est réellement disponible.", subtitle: "Les produits présentés au public sont actifs et en stock.", description: "Kimoxa filtre le catalogue public pour éviter de mettre en avant des articles indisponibles.", primaryLabel: "Explorer les produits", primaryHref: "/shop", secondaryLabel: "Voir les catégories", secondaryHref: "/shop", visual: "stock" },
  { id: 3, tag: "Pour les vendeurs", title: "Mettre les commerçants au centre.", subtitle: "Produits, stock et boutique réunis dans un même espace.", description: "Les vendeurs disposent d’outils pour présenter leurs produits et suivre leur stock au fil des ventes.", primaryLabel: "Découvrir Kimoxa", primaryHref: "/", secondaryLabel: "Voir le catalogue", secondaryHref: "/shop", visual: "seller" },
  { id: 4, tag: "Une expérience structurée", title: "Du produit à la commande.", subtitle: "Catalogue, panier, commande et paiement dans un même parcours.", description: "L’architecture relie la découverte des produits au parcours de commande et aux moyens de paiement intégrés.", primaryLabel: "Commencer mes achats", primaryHref: "/shop", secondaryLabel: "Découvrir Kimoxa", secondaryHref: "/", visual: "flow" },
  { id: 5, tag: "Un commerce vivant", title: "Des nouveautés qui arrivent, des offres qui évoluent.", subtitle: "Nouveautés, ventes flash et catalogue dynamique.", description: "La page d’accueil met en avant les nouveautés et les ventes flash sans abandonner la logique du catalogue public.", primaryLabel: "Voir les nouveautés", primaryHref: "/shop", secondaryLabel: "Voir les offres", secondaryHref: "/shop", visual: "offers" },
  { id: 6, tag: "Notre ambition", title: "Construire pour grandir avec l’Afrique.", subtitle: "Une base africaine, une ambition continentale.", description: "Kimoxa commence avec une architecture pensée pour évoluer avec les besoins des acheteurs, des vendeurs et des marchés africains.", primaryLabel: "Découvrir Kimoxa", primaryHref: "/", secondaryLabel: "Explorer le catalogue", secondaryHref: "/shop", visual: "africa" },
];

const AUTOPLAY_MS = 5000;
const SWIPE_THRESHOLD = 50;

function getProductImage(product) {
  if (!product) return null;
  const images = Array.isArray(product.images) ? product.images : [];
  return images.find((src) => typeof src === "string" && src.trim()) || null;
}

function ProductThumb({ product, className }) {
  const image = getProductImage(product);
  if (!image) return <div className={className} aria-hidden="true" />;
  return (
    <div className={className}>
      <Image src={image} alt={product?.name ? `Produit Kimoxa : ${product.name}` : "Produit Kimoxa"} fill sizes="180px" className="object-cover" unoptimized />
    </div>
  );
}

export default function BannerCarousel({ featuredProducts = [] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef(null);
  const touchDeltaX = useRef(0);

  const goTo = useCallback((i) => setIndex((i + STORY_SLIDES.length) % STORY_SLIDES.length), []);
  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % STORY_SLIDES.length), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [paused]);

  function handleTouchStart(e) { touchStartX.current = e.touches[0].clientX; touchDeltaX.current = 0; setPaused(true); }
  function handleTouchMove(e) { if (touchStartX.current !== null) touchDeltaX.current = e.touches[0].clientX - touchStartX.current; }
  function handleTouchEnd() {
    if (touchDeltaX.current > SWIPE_THRESHOLD) prev();
    else if (touchDeltaX.current < -SWIPE_THRESHOLD) next();
    touchStartX.current = null;
    touchDeltaX.current = 0;
    setPaused(false);
  }

  const slide = STORY_SLIDES[index];
  const products = featuredProducts.filter(Boolean).slice(0, 6);
  const fallbackProducts = products.length ? products : [null, null, null];
  const product = (offset = 0) => fallbackProducts[(index + offset) % fallbackProducts.length];

  function renderVisual() {
    if (slide.visual === "vision") {
      return products.length ? (
        <div className={styles.productStage}>
          {fallbackProducts.slice(0, 3).map((item, i) => item ? (
            <div className={styles.productCard} key={`${item.id || item.name || "product"}-${i}`}>
              <ProductThumb product={item} className={styles.productImage} />
              <div className={styles.productMeta}><span className={styles.productName}>{item.name || "Produit Kimoxa"}</span><span className={styles.productStatus}>Disponible</span></div>
            </div>
          ) : null)}
        </div>
      ) : (
        <div className={styles.emptyVisual}><span className={styles.kMark}>K</span><span className={styles.kCaption}>Kimoxa · commerce africain</span></div>
      );
    }

    if (slide.visual === "stock") {
      return (
        <div className={styles.stockPanel}>
          <div className={styles.panelTop}><span className={styles.panelTitle}>Catalogue public</span><span className={styles.panelCode}>LIVE</span></div>
          <div className={styles.stockRows}>
            {fallbackProducts.slice(0, 3).map((item, i) => item ? (
              <div className={styles.stockRow} key={`${item.id || item.name}-${i}`}>
                <ProductThumb product={item} className={styles.thumb} />
                <div><div className={styles.rowName}>{item.name || "Produit"}</div><div className={styles.rowMeta}>catalogue public</div></div>
                <span className={styles.ok}>en stock</span>
              </div>
            ) : null)}
          </div>
        </div>
      );
    }

    if (slide.visual === "seller") {
      return (
        <div className={styles.sellerPanel}>
          <div className={styles.panelTop}><span className={styles.panelTitle}>Espace vendeur</span><span className={styles.panelCode}>KIMOXA</span></div>
          <div className={styles.sellerBody}>
            <div className={styles.sellerIdentity}><div className={styles.avatar}>K</div><div><div className={styles.sellerName}>Ma boutique</div><div className={styles.sellerRole}>Produits · stock · commandes</div></div></div>
            <div className={styles.sellerMetrics}><div className={styles.metric}><strong>{products.length || "—"}</strong><span>produits visibles</span></div><div className={styles.metric}><strong>●</strong><span>stock suivi</span></div><div className={styles.metric}><strong>✓</strong><span>catalogue actif</span></div></div>
          </div>
        </div>
      );
    }

    if (slide.visual === "flow") {
      return (
        <div className={styles.flowPanel}>
          <div className={styles.flowTitle}>Un parcours relié de bout en bout.</div>
          <div className={styles.flowSub}>La technologie disparaît derrière une expérience simple.</div>
          <div className={styles.flow}>{["Produit", "Panier", "Commande", "Paiement"].map((label) => <div className={styles.flowNode} key={label}>{label}</div>)}</div>
        </div>
      );
    }

    if (slide.visual === "offers") {
      return (
        <div className={styles.offerPanel}>
          <div className={styles.panelTop}><span className={styles.panelTitle}>Commerce vivant</span><span className={styles.panelCode}>NOUVEAU</span></div>
          <div className={styles.offerGrid}>{fallbackProducts.slice(0, 4).map((item, i) => item ? (
            <div className={styles.offerCard} key={`${item.id || item.name}-${i}`}>
              <ProductThumb product={item} className={styles.offerCardImage} />
              <div className={styles.offerOverlay}><span className={styles.offerBadge}>{i % 2 ? "Nouveau" : "Offre"}</span><span className={styles.offerName}>{item.name || "Produit Kimoxa"}</span></div>
            </div>
          ) : null)}</div>
        </div>
      );
    }

    return (
      <div className={styles.africaPanel}>
        <div className={styles.network} aria-hidden="true">
          <span className={styles.node} /><span className={styles.node} /><span className={styles.node} /><span className={styles.node} /><span className={styles.node} />
          <span className={styles.networkLabel}>Afrique · connectée par le commerce</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.storyCarousel} role="region" aria-roledescription="carrousel" aria-label="L’histoire de Kimoxa" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <button type="button" className={`${styles.arrow} ${styles.arrowLeft}`} onClick={prev} aria-label="Diapositive précédente">‹</button>
      <div key={slide.id} className={styles.slide} role="group" aria-roledescription="diapositive" aria-label={`${index + 1} sur ${STORY_SLIDES.length} : ${slide.title}`}>
        <div className={styles.copy}>
          <span className={styles.eyebrow}>{slide.tag}</span>
          <h1 className={styles.title}>{slide.title}</h1>
          <p className={styles.subtitle}>{slide.subtitle}</p>
          <p className={styles.description}>{slide.description}</p>
          <div className={styles.ctaRow}><Link href={slide.primaryHref} className={styles.primary}>{slide.primaryLabel}</Link><Link href={slide.secondaryHref} className={styles.secondary}>{slide.secondaryLabel}</Link></div>
        </div>
        <div className={styles.visual}>{renderVisual()}</div>
      </div>
      <button type="button" className={`${styles.arrow} ${styles.arrowRight}`} onClick={next} aria-label="Diapositive suivante">›</button>
      <div className={styles.dots} role="tablist" aria-label="Choisir une diapositive">{STORY_SLIDES.map((s, i) => <button key={s.id} type="button" role="tab" aria-selected={i === index} className={`${styles.dot} ${i === index ? styles.dotActive : ""}`} onClick={() => goTo(i)} aria-label={`Aller à la diapositive ${i + 1} : ${s.title}`} />)}</div>
    </div>
  );
}
