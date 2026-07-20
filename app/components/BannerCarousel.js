"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

const THEME_GRADIENTS = {
  "slide-gold": "linear-gradient(135deg, #241712 0%, #a1730f 130%)",
  "slide-bissap": "linear-gradient(135deg, #241712 0%, #9e2b3e 130%)",
  "slide-millet": "linear-gradient(135deg, #241712 0%, #3f6b3f 130%)",
};

const SLIDES = [
  {
    id: 1,
    type: "promo",
    tag: "Livraison nationale",
    title: "Commandez où que vous soyez au Burkina Faso",
    subtitle: "Paiement à la livraison disponible sur toutes les boutiques",
    cta: "Découvrir le catalogue",
    href: "/shop",
    theme: "slide-gold",
    image: "/images/slide-livraison.jpg", // à fournir
  },
  {
    id: 2,
    type: "promo",
    tag: "Vendeurs locaux",
    title: "Des boutiques vérifiées, un savoir-faire burkinabè",
    subtitle: "Artisanat, mode, électronique et plus encore",
    cta: "Voir les boutiques",
    href: "/shop",
    theme: "slide-bissap",
    image: "/images/slide-boutiques.jpg", // à fournir
  },
  {
    id: 3,
    type: "promo",
    tag: "Bientôt disponible",
    title: "Paiement Mobile Money en un clic",
    subtitle: "Orange Money et Moov Money arrivent sur FasoShop",
    cta: "En savoir plus",
    href: "/shop",
    theme: "slide-millet",
    image: "/images/slide-mobilemoney.jpg", // à fournir
  },
  {
    id: 4,
    type: "founder",
    tag: "Notre fondateur",
    quote:
      "Le e-commerce ne devrait pas être réservé aux grandes villes. Avec FasoShop, chaque vendeur burkinabè trouve sa place, et chaque acheteur trouve ce qu'il cherche — où qu'il soit dans le pays.",
    name: "KIEMDE P. Toussaint",
    role: "Fondateur & CEO, FasoShop",
    photo: "/images/founder.jpg",
    theme: "slide-ink",
  },
];

const AUTOPLAY_MS = 5000;

export default function BannerCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, []);

  function goTo(i) {
    setIndex((i + SLIDES.length) % SLIDES.length);
  }

  const slide = SLIDES[index];
  const hasPhoto = Boolean(slide.image);
  const fallbackGradient = THEME_GRADIENTS[slide.theme] || THEME_GRADIENTS["slide-gold"];

  return (
    <div
      className={`banner-carousel ${slide.theme} ${hasPhoto ? "slide-photo" : ""}`}
      style={
        hasPhoto
          ? { backgroundImage: `url(${slide.image}), ${fallbackGradient}` }
          : undefined
      }
    >
      <button
        className="banner-arrow banner-arrow-left"
        onClick={() => goTo(index - 1)}
        aria-label="Offre précédente"
      >
        ‹
      </button>

      {slide.type === "founder" ? (
        <div className="banner-slide banner-founder">
          <div className="founder-photo-wrap">
            <Image
              src={slide.photo}
              alt={slide.name}
              width={140}
              height={140}
              className="founder-photo"
            />
          </div>
          <span className="banner-tag">{slide.tag}</span>
          <p className="founder-quote">"{slide.quote}"</p>
          <div className="founder-attribution">
            <span className="founder-name">{slide.name}</span>
            <span className="founder-role">{slide.role}</span>
          </div>
        </div>
      ) : (
        <div className="banner-slide">
          <span className="banner-tag">{slide.tag}</span>
          <h1 className="banner-title">{slide.title}</h1>
          <p className="banner-subtitle">{slide.subtitle}</p>
          <Link href={slide.href} className="btn btn-primary btn-hero">
            {slide.cta}
          </Link>
        </div>
      )}

      <button
        className="banner-arrow banner-arrow-right"
        onClick={() => goTo(index + 1)}
        aria-label="Offre suivante"
      >
        ›
      </button>

      <div className="banner-dots">
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            className={`banner-dot ${i === index ? "active" : ""}`}
            onClick={() => goTo(i)}
            aria-label={`Aller à l'offre ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}