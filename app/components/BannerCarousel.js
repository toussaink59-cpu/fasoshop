"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

// Carrousel premium Kimoxa : photos africaines modernes et urbaines
// Jeunesse dynamique, tech, mode contemporaine, contexte africain 2024
const SLIDES = [
  {
    id: 1,
    kicker: "OFFRES LIMITÉES",
    title: "Jusqu'à -50%",
    subtitle: "Sur la mode et la beauté africaine",
    cta: "Profiter des soldes",
    href: "/shop",
    // Jeune femme africaine moderne, urbaine, shopping
    image: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=1600&q=80",
    badge: "-50%",
    badgeColor: "#e11d48",
  },
  {
    id: 2,
    kicker: "FRAÎCHEMENT ARRIVÉ",
    title: "Nouveautés",
    subtitle: "Les dernières tendances de la semaine",
    cta: "Découvrir",
    href: "/shop?sort=newest",
    // Femme africaine moderne avec laptop, entrepreneuse
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1600&q=80",
    badge: "NEW",
    badgeColor: "#059669",
  },
  {
    id: 3,
    kicker: "MODE AFRICAINE",
    title: "Sublimez",
    subtitle: "Vêtements, chaussures, accessoires modernes",
    cta: "Voir la collection",
    href: "/shop?category=mode",
    // Mode africaine contemporaine, pagne moderne, urbain
    image: "https://images.unsplash.com/photo-1589156280159-276d3cc69f84?auto=format&fit=crop&w=1600&q=80",
    badge: "TENDANCE",
    badgeColor: "#c08a1e",
  },
  {
    id: 4,
    kicker: "HIGH-TECH",
    title: "Smartphones",
    subtitle: "Toutes les marques, livrés en 48h",
    cta: "Comparer les prix",
    href: "/shop?category=telephones",
    // Jeune homme africain moderne avec smartphone
    image: "https://images.unsplash.com/photo-1611042553484-d61f942c8145?auto=format&fit=crop&w=1600&q=80",
    badge: "TOP VENTES",
    badgeColor: "#0ea5e9",
  },
  {
    id: 5,
    kicker: "MAISON & DÉCO",
    title: "Équipez-vous",
    subtitle: "Électroménager, meubles, ustensiles modernes",
    cta: "Voir le catalogue",
    href: "/shop?category=maison",
    // Cuisine moderne africaine, décoration contemporaine
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=1600&q=80",
    badge: "-30%",
    badgeColor: "#e11d48",
  },
  {
    id: 6,
    kicker: "100% SÉCURISÉ",
    title: "Mobile Money",
    subtitle: "Orange, Moov, Wave — paiement protégé",
    cta: "En savoir plus",
    href: "/cgu",
    // Transaction mobile money africaine
    image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=1600&q=80",
    badge: "GARANTIE",
    badgeColor: "#16a34a",
  },
];

const AUTOPLAY_MS = 5500;
const SWIPE_THRESHOLD = 50;

export default function BannerCarousel() {
  const [index, setIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState(null);
  const [paused, setPaused] = useState(false);
  const [brokenImages, setBrokenImages] = useState({});
  const touchStartX = useRef(null);
  const touchDeltaX = useRef(0);

  const goTo = useCallback((i) => {
    const next = (i + SLIDES.length) % SLIDES.length;
    setPrevIndex(index);
    setIndex(next);
  }, [index]);

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setPrevIndex((p) => (p === null ? SLIDES.length - 1 : p));
      setIndex((i) => {
        setPrevIndex(i);
        return (i + 1) % SLIDES.length;
      });
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [paused, index]);

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

  const slide = SLIDES[index];
  const prevSlide = prevIndex !== null ? SLIDES[prevIndex] : null;
  const showImage = slide.image && !brokenImages[slide.id];
  const showPrevImage = prevSlide?.image && !brokenImages[prevSlide.id];

  return (
    <div
      className={`hero-carousel ${paused ? "is-paused" : ""}`}
      role="region"
      aria-roledescription="carrousel"
      aria-label="Offres Kimoxa"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* SLIDE PRÉCÉDENTE (sortie en fondu) */}
      {prevSlide && (
        <div className="hero-slide hero-slide-exit" aria-hidden="true">
          {showPrevImage && (
            <img
              src={prevSlide.image}
              alt=""
              className="hero-slide-bg"
              onError={() => setBrokenImages((b) => ({ ...b, [prevSlide.id]: true }))}
            />
          )}
        </div>
      )}

      {/* SLIDE ACTUELLE */}
      <div
        key={slide.id}
        className={`hero-slide hero-slide-enter ${showImage ? "has-image" : ""}`}
        role="group"
        aria-roledescription="diapositive"
        aria-label={`${index + 1} sur ${SLIDES.length} : ${slide.title}`}
      >
        {showImage ? (
          <img
            src={slide.image}
            alt={slide.title}
            className="hero-slide-bg"
            loading={index === 0 ? "eager" : "lazy"}
            onError={() => setBrokenImages((b) => ({ ...b, [slide.id]: true }))}
          />
        ) : (
          <div className="hero-slide-fallback" aria-hidden="true" />
        )}

        <div className="hero-slide-overlay" />

        <div className="hero-slide-content">
          <span className="hero-kicker">{slide.kicker}</span>
          <h1 className="hero-title">{slide.title}</h1>
          <p className="hero-subtitle">{slide.subtitle}</p>
          <Link href={slide.href} className="hero-cta">
            {slide.cta}
            <span className="hero-cta-arrow">→</span>
          </Link>
        </div>

        {slide.badge && (
          <div className="hero-badge" style={{ background: slide.badgeColor }}>
            {slide.badge}
          </div>
        )}

        <button
          type="button"
          className="hero-arrow hero-arrow-left"
          onClick={prev}
          aria-label="Précédent"
        >
          ‹
        </button>
        <button
          type="button"
          className="hero-arrow hero-arrow-right"
          onClick={next}
          aria-label="Suivant"
        >
          ›
        </button>

        <div className="hero-indicators" role="tablist">
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              className={`hero-indicator ${i === index ? "is-active" : ""}`}
              onClick={() => goTo(i)}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>

        <div className="hero-progress" key={`progress-${index}-${paused}`}>
          <div className="hero-progress-fill" />
        </div>
      </div>
    </div>
  );
}
