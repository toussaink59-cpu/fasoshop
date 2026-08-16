"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";

// Les visuels du récit proviennent des vrais produits déjà publiés dans le
// catalogue public. Aucun visuel stock/générique n'est injecté dans le hero.
const STORY_SLIDES = [
  {
    id: 1,
    tag: "Notre vision",
    title: "Né en Afrique, pensé pour l’Afrique.",
    subtitle: "Kimoxa connecte l’Afrique qui vend à l’Afrique qui achète.",
    description: "Une marketplace multi-vendeurs conçue pour rendre le commerce local plus accessible et plus structuré.",
    primaryLabel: "Découvrir le catalogue",
    primaryHref: "/shop",
    secondaryLabel: "Notre vision",
    secondaryHref: "/a-propos",
    theme: "slide-t1",
    imageIndex: 0,
  },
  {
    id: 2,
    tag: "Catalogue public",
    title: "Voir ce qui est réellement disponible.",
    subtitle: "Les produits présentés au public sont actifs et en stock.",
    description: "Kimoxa filtre le catalogue public pour éviter de mettre en avant des articles indisponibles.",
    primaryLabel: "Explorer les produits",
    primaryHref: "/shop",
    secondaryLabel: "Voir les catégories",
    secondaryHref: "/shop",
    theme: "slide-t2",
    imageIndex: 1,
  },
  {
    id: 3,
    tag: "Pour les vendeurs",
    title: "Mettre les commerçants au centre.",
    subtitle: "Produits, stock et boutique réunis dans un même espace.",
    description: "Les vendeurs disposent d’outils pour présenter leurs produits et suivre leur stock au fil des ventes.",
    primaryLabel: "Découvrir Kimoxa",
    primaryHref: "/a-propos",
    secondaryLabel: "Voir le catalogue",
    secondaryHref: "/shop",
    theme: "slide-t3",
    imageIndex: 2,
  },
  {
    id: 4,
    tag: "Une expérience structurée",
    title: "Du produit à la commande.",
    subtitle: "Catalogue, panier, commande et paiement dans un même parcours.",
    description: "L’architecture relie la découverte des produits au parcours de commande et aux différents moyens de paiement intégrés.",
    primaryLabel: "Commencer mes achats",
    primaryHref: "/shop",
    secondaryLabel: "Découvrir",
    secondaryHref: "/a-propos",
    theme: "slide-t4",
    imageIndex: 3,
  },
  {
    id: 5,
    tag: "Un commerce vivant",
    title: "Des nouveautés qui arrivent, des offres qui évoluent.",
    subtitle: "Nouveautés, ventes flash et catalogue dynamique.",
    description: "La page d’accueil met en avant les nouveautés et les ventes flash sans abandonner la logique du catalogue public.",
    primaryLabel: "Voir les nouveautés",
    primaryHref: "/shop",
    secondaryLabel: "Voir les offres",
    secondaryHref: "/shop",
    theme: "slide-t5",
    imageIndex: 4,
  },
  {
    id: 6,
    tag: "Notre ambition",
    title: "Construire pour grandir avec l’Afrique.",
    subtitle: "Une base africaine, une ambition continentale.",
    description: "Kimoxa commence avec une architecture pensée pour évoluer avec les besoins des acheteurs, des vendeurs et des marchés africains.",
    primaryLabel: "Découvrir Kimoxa",
    primaryHref: "/a-propos",
    secondaryLabel: "Explorer le catalogue",
    secondaryHref: "/shop",
    theme: "slide-t6",
    imageIndex: 5,
  },
];

const AUTOPLAY_MS = 5000;
const SWIPE_THRESHOLD = 50;

function getProductImage(product) {
  if (!product) return null;
  const images = Array.isArray(product.images) ? product.images : [];
  return images.find((src) => typeof src === "string" && src.trim()) || null;
}

export default function BannerCarousel({ featuredProducts = [] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef(null);
  const touchDeltaX = useRef(0);

  const goTo = useCallback((i) => {
    setIndex((i + STORY_SLIDES.length) % STORY_SLIDES.length);
  }, []);

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % STORY_SLIDES.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [paused]);

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
    setPaused(true);
  }

  function handleTouchMove(e) {
    if (touchStartX.current === null) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  }

  function handleTouchEnd() {
    if (touchDeltaX.current > SWIPE_THRESHOLD) prev();
    else if (touchDeltaX.current < -SWIPE_THRESHOLD) next();
    touchStartX.current = null;
    touchDeltaX.current = 0;
    setPaused(false);
  }

  const slide = STORY_SLIDES[index];
  const product = featuredProducts.length
    ? featuredProducts[slide.imageIndex % featuredProducts.length]
    : null;
  const image = getProductImage(product);

  return (
    <div
      className={`hero-carousel ${slide.theme}`}
      role="region"
      aria-roledescription="carrousel"
      aria-label="L’histoire de Kimoxa"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <button type="button" className="hero-arrow hero-arrow-left" onClick={prev} aria-label="Diapositive précédente">‹</button>

      <div
        key={slide.id}
        className="hero-slide"
        role="group"
        aria-roledescription="diapositive"
        aria-label={`${index + 1} sur ${STORY_SLIDES.length} : ${slide.title}`}
      >
        <div className="hero-slide-text">
          <span className="hero-tag">{slide.tag}</span>
          <h1 className="hero-title">{slide.title}</h1>
          <p className="hero-subtitle">{slide.subtitle}</p>
          <p className="hero-description">{slide.description}</p>
          <div className="hero-cta-row">
            <Link href={slide.primaryHref} className="btn hero-cta-primary">{slide.primaryLabel}</Link>
            <Link href={slide.secondaryHref} className="hero-cta-secondary">{slide.secondaryLabel}</Link>
          </div>
        </div>

        <div className="hero-slide-visual">
          {image ? (
            <div className="hero-real-product">
              <Image
                src={image}
                alt={product?.name ? `Produit Kimoxa : ${product.name}` : "Produit disponible sur Kimoxa"}
                fill
                sizes="(max-width: 767px) 80vw, (max-width: 1023px) 38vw, 32vw"
                className="hero-slide-image"
                priority={index === 0}
                loading={index === 0 ? "eager" : "lazy"}
                unoptimized
              />
              {product?.name ? <span className="hero-product-caption">{product.name}</span> : null}
            </div>
          ) : (
            <div className="hero-slide-icon-panel" aria-hidden="true">
              <span className="hero-slide-icon">K</span>
            </div>
          )}
        </div>
      </div>

      <button type="button" className="hero-arrow hero-arrow-right" onClick={next} aria-label="Diapositive suivante">›</button>

      <div className="hero-dots" role="tablist" aria-label="Choisir une diapositive">
        {STORY_SLIDES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={i === index}
            className={`hero-dot ${i === index ? "active" : ""}`}
            onClick={() => goTo(i)}
            aria-label={`Aller à la diapositive ${i + 1} : ${s.title}`}
          />
        ))}
      </div>
    </div>
  );
}
