"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./BannerCarousel.module.css";

const STORY_SLIDES = [
  {
    id: "01",
    tag: "POUR LES COMMERÇANTS",
    title: "CRÉEZ VOTRE BOUTIQUE",
    accent: "EN QUELQUES MINUTES",
    description: "Présentez votre activité dans un espace pensé pour vendre en ligne.",
    image: "/images/founder.jpg",
    alt: "Entrepreneur africain dans son environnement de travail",
    panelTitle: "CRÉER MA BOUTIQUE",
    panelItems: ["INFORMATIONS", "BOUTIQUE", "VÉRIFICATION"],
  },
  {
    id: "02",
    tag: "VOTRE CATALOGUE",
    title: "PRÉSENTEZ VOS PRODUITS",
    accent: "À VOTRE IMAGE",
    description: "Ajoutez vos produits, vos prix et votre stock. Votre boutique reste sous votre contrôle.",
    image: "/images/lifestyle-shopping-femme.jpg",
    alt: "Cliente africaine utilisant son téléphone dans un contexte commercial",
    panelTitle: "NOUVEAU PRODUIT",
    panelItems: ["PHOTO", "DESCRIPTION", "PRIX", "STOCK"],
  },
  {
    id: "03",
    tag: "VISIBILITÉ",
    title: "FAITES DÉCOUVRIR VOTRE BOUTIQUE",
    accent: "À DE NOUVEAUX CLIENTS",
    description: "Votre boutique rejoint un catalogue conçu pour rapprocher l'offre locale des acheteurs.",
    image: "/images/lifestyle-famille-supermarche.jpg",
    alt: "Famille africaine dans un espace commercial",
    panelTitle: "CATALOGUE KIMOXA",
    panelItems: ["BOUTIQUES", "CATÉGORIES", "RECHERCHE"],
  },
  {
    id: "04",
    tag: "COMMANDES",
    title: "RECEVEZ VOS COMMANDES",
    accent: "ET GARDEZ LE CONTRÔLE",
    description: "Chaque vendeur gère ses commandes et l'exécution de ses ventes.",
    image: "/images/founder.jpg",
    alt: "Entrepreneur africain travaillant avec son téléphone",
    panelTitle: "NOUVELLE COMMANDE",
    panelItems: ["CLIENT", "ARTICLES", "MONTANT", "STATUT"],
  },
  {
    id: "05",
    tag: "PAIEMENTS",
    title: "PAYEZ ET VENDEZ EN TOUTE CONFIANCE",
    accent: "AVEC LES MOYENS DISPONIBLES",
    description: "Kimoxa intègre des parcours de paiement adaptés au contexte de la commande.",
    image: "/images/slide-mobilemoney.jpg",
    alt: "Paiement mobile dans un contexte africain",
    panelTitle: "PAIEMENT",
    panelItems: ["MOBILE MONEY", "STATUT", "COMMANDE"],
  },
  {
    id: "06",
    tag: "NOTRE AMBITION",
    title: "GRANDISSEZ AVEC KIMOXA",
    accent: "NÉ EN AFRIQUE, PENSÉ POUR L'AFRIQUE",
    description: "Commencez avec votre boutique. Construisez votre activité avec une marketplace conçue pour évoluer avec l'Afrique.",
    image: "/images/lifestyle-famille-canape.jpg",
    alt: "Famille africaine dans un intérieur contemporain",
    panelTitle: "VOTRE ACTIVITÉ",
    panelItems: ["BOUTIQUE", "COMMANDES", "CROISSANCE"],
  },
];

const AUTOPLAY_MS = 5000;
const SWIPE_THRESHOLD = 50;

export default function BannerCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef(null);
  const touchDeltaX = useRef(0);

  const goTo = useCallback((nextIndex) => {
    setIndex((nextIndex + STORY_SLIDES.length) % STORY_SLIDES.length);
  }, []);

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    const onVisibilityChange = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    if (paused) return undefined;
    const timer = setInterval(() => setIndex((current) => (current + 1) % STORY_SLIDES.length), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [paused]);

  function handleTouchStart(event) {
    touchStartX.current = event.touches[0].clientX;
    touchDeltaX.current = 0;
    setPaused(true);
  }

  function handleTouchMove(event) {
    if (touchStartX.current !== null) touchDeltaX.current = event.touches[0].clientX - touchStartX.current;
  }

  function handleTouchEnd() {
    if (touchDeltaX.current > SWIPE_THRESHOLD) prev();
    if (touchDeltaX.current < -SWIPE_THRESHOLD) next();
    touchStartX.current = null;
    touchDeltaX.current = 0;
    setPaused(false);
  }

  const slide = STORY_SLIDES[index];

  return (
    <section
      className={styles.carousel}
      aria-label="Pourquoi vendre sur Kimoxa"
      role="region"
      aria-roledescription="carrousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className={styles.progress} aria-hidden="true">
        <span style={{ width: `${((index + 1) / STORY_SLIDES.length) * 100}%` }} />
      </div>

      <button type="button" className={`${styles.arrow} ${styles.arrowLeft}`} onClick={prev} aria-label="Diapositive précédente">‹</button>

      <div key={slide.id} className={styles.slide} role="group" aria-roledescription="diapositive" aria-label={`${slide.id} sur 06 : ${slide.title}`}>
        <div className={styles.media}>
          <Image src={slide.image} alt={slide.alt} fill sizes="(max-width: 720px) 100vw, 52vw" priority={index === 0} className={styles.image} />
          <div className={styles.mediaShade} />
          <span className={styles.slideNumber}>{slide.id}</span>
          <div className={styles.brand}>KIMOXA <span aria-hidden="true">◼</span></div>
        </div>

        <div className={styles.content}>
          <span className={styles.tag}>{slide.tag}</span>
          <h2 className={styles.title}>{slide.title}</h2>
          <div className={styles.accent}>{slide.accent}</div>
          <p className={styles.description}>{slide.description}</p>

          <div className={styles.featurePanel}>
            <div className={styles.panelHeader}>
              <span>{slide.panelTitle}</span>
              <span className={styles.panelStatus}>KIMOXA</span>
            </div>
            <div className={styles.panelItems}>
              {slide.panelItems.map((item) => (
                <span key={item} className={styles.panelItem}><i aria-hidden="true">✓</i>{item}</span>
              ))}
            </div>
          </div>

          <div className={styles.actions}>
            <Link href="/register?role=vendor" className={styles.primary}>CRÉER MA BOUTIQUE <span aria-hidden="true">→</span></Link>
            <Link href="/a-propos" className={styles.secondary}>EN SAVOIR PLUS</Link>
          </div>
        </div>
      </div>

      <button type="button" className={`${styles.arrow} ${styles.arrowRight}`} onClick={next} aria-label="Diapositive suivante">›</button>

      <div className={styles.indicators} role="tablist" aria-label="Choisir une diapositive">
        {STORY_SLIDES.map((item, itemIndex) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={itemIndex === index}
            className={`${styles.indicator} ${itemIndex === index ? styles.active : ""}`}
            onClick={() => goTo(itemIndex)}
            aria-label={`Aller à la diapositive ${item.id}`}
          >
            {item.id}
          </button>
        ))}
      </div>
    </section>
  );
}
