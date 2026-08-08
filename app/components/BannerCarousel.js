"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

// Carrousel premium Kimoxa : vraies photos HD (Unsplash), effet Ken Burns,
// barre de progression de l'autoplay, badges promo flottants, swipe mobile.
// Si une photo ne charge pas, bascule automatique sur le panneau icône.
const SLIDES = [
  {
    id: 1,
    tag: "Offres du moment",
    title: "Promotions exclusives",
    subtitle: "Jusqu'à -50% sur une sélection de produits",
    description: "Profitez de réductions exceptionnelles chaque semaine, sur des centaines d'articles.",
    primaryLabel: "Acheter maintenant",
    primaryHref: "/shop",
    secondaryLabel: "Ventes flash",
    secondaryHref: "/shop",
    theme: "slide-t1",
    icon: "🏷️",
    image: "https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?auto=format&fit=crop&w=1600&q=70",
    badge: "-50%",
  },
  {
    id: 2,
    tag: "Fraîchement arrivé",
    title: "Découvrez les nouveautés",
    subtitle: "Les derniers produits ajoutés par nos vendeurs vérifiés",
    description: "Soyez parmi les premiers à découvrir les articles tout juste mis en ligne.",
    primaryLabel: "Acheter maintenant",
    primaryHref: "/shop",
    secondaryLabel: "Découvrir",
    secondaryHref: "/shop",
    theme: "slide-t2",
    icon: "✨",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=70",
    badge: null,
  },
  {
    id: 3,
    tag: "Mode & Beauté",
    title: "Sublimez votre style",
    subtitle: "Vêtements, chaussures et cosmétiques",
    description: "Des tenues tendance et des soins de beauté pour toute la famille.",
    primaryLabel: "Acheter maintenant",
    primaryHref: "/shop?category=mode",
    secondaryLabel: "Découvrir",
    secondaryHref: "/shop?category=beaute",
    theme: "slide-t3",
    icon: "👗",
    image: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1600&q=70",
    badge: "Tendance",
  },
  {
    id: 4,
    tag: "Électronique",
    title: "La technologie à portée de main",
    subtitle: "Téléphones, ordinateurs et accessoires",
    description: "Des appareils fiables aux meilleurs prix, livrés partout au Burkina Faso.",
    primaryLabel: "Acheter maintenant",
    primaryHref: "/shop?category=electronique",
    secondaryLabel: "Découvrir",
    secondaryHref: "/shop?category=telephones",
    theme: "slide-t4",
    icon: "📱",
    image: "https://images.unsplash.com/photo-1511707171631-6f5687e5b1de?auto=format&fit=crop&w=1600&q=70",
    badge: null,
  },
  {
    id: 5,
    tag: "Maison & Cuisine",
    title: "Équipez votre foyer",
    subtitle: "Électroménager, meubles et décoration",
    description: "Tout pour rendre votre maison plus confortable et plus belle, au quotidien.",
    primaryLabel: "Acheter maintenant",
    primaryHref: "/shop?category=maison",
    secondaryLabel: "Découvrir",
    secondaryHref: "/shop?category=maison",
    theme: "slide-t5",
    icon: "🏠",
    image: "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1600&q=70",
    badge: null,
  },
  {
    id: 6,
    tag: "Paiement sécurisé",
    title: "Payez en Mobile Money",
    subtitle: "Orange Money, Moov Money, Wave et MTN acceptés",
    description: "Votre argent est séquestré par Kimoxa et libéré uniquement à la livraison.",
    primaryLabel: "Voir le catalogue",
    primaryHref: "/shop",
    secondaryLabel: "Devenir vendeur",
    secondaryHref: "/register?role=vendor",
    theme: "slide-t6",
    icon: "💳",
    image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=1600&q=70",
    badge: "Sécurisé",
  },
];

const AUTOPLAY_MS = 5000;
const SWIPE_THRESHOLD = 50;

export default function BannerCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [brokenImages, setBrokenImages] = useState({});
  const touchStartX = useRef(null);
  const touchDeltaX = useRef(0);

  const goTo = useCallback((i) => {
    setIndex((i + SLIDES.length) % SLIDES.length);
  }, []);

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
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
    if (touchDeltaX.current > SWIPE_THRESHOLD) {
      prev();
    } else if (touchDeltaX.current < -SWIPE_THRESHOLD) {
      next();
    }
    touchStartX.current = null;
    touchDeltaX.current = 0;
    setPaused(false);
  }

  const slide = SLIDES[index];
  const showImage = slide.image && !brokenImages[slide.id];

  return (
    <div
      className={`hero-carousel ${slide.theme} ${paused ? "is-paused" : ""}`}
      role="region"
      aria-roledescription="carrousel"
      aria-label="Mises en avant Kimoxa"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <button
        type="button"
        className="hero-arrow hero-arrow-left"
        onClick={prev}
        aria-label="Diapositive précédente"
      >
        ‹
      </button>

      <div
        key={slide.id}
        className={`hero-slide ${showImage ? "has-image" : ""}`}
        role="group"
        aria-roledescription="diapositive"
        aria-label={`${index + 1} sur ${SLIDES.length} : ${slide.title}`}
      >
        <div className="hero-slide-text">
          <span className="hero-tag">{slide.tag}</span>
          <h1 className="hero-title">{slide.title}</h1>
          <p className="hero-subtitle">{slide.subtitle}</p>
          <p className="hero-description">{slide.description}</p>
          <div className="hero-cta-row">
            <Link href={slide.primaryHref} className="btn hero-cta-primary">
              {slide.primaryLabel}
            </Link>
            <Link href={slide.secondaryHref} className="hero-cta-secondary">
              {slide.secondaryLabel}
            </Link>
          </div>
        </div>

        <div className="hero-slide-visual">
          {showImage ? (
            <img
              src={slide.image}
              alt={slide.title}
              className="hero-slide-image"
              loading={index === 0 ? "eager" : "lazy"}
              onError={() => setBrokenImages((b) => ({ ...b, [slide.id]: true }))}
            />
          ) : (
            <div className="hero-slide-icon-panel" aria-hidden="true">
              <span className="hero-slide-icon">{slide.icon}</span>
            </div>
          )}
        </div>

        {slide.badge && <div className="hero-badge">{slide.badge}</div>}
      </div>

      <button
        type="button"
        className="hero-arrow hero-arrow-right"
        onClick={next}
        aria-label="Diapositive suivante"
      >
        ›
      </button>

      <div className="hero-dots" role="tablist" aria-label="Choisir une diapositive">
        {SLIDES.map((s, i) => (
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

      {/* Barre de progression de l'autoplay (repart à zéro à chaque slide) */}
      <div className="hero-progress" key={`progress-${index}`} aria-hidden="true">
        <div className="hero-progress-fill" />
      </div>
    </div>
  );
}
