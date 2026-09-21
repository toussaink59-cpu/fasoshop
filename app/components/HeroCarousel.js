"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { hasDiscount, discountPercent } from "@/app/components/PriceDisplay";
import {
  BadgeCheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  StarIcon,
} from "@/app/components/Icons";
import styles from "./HeroCarousel.module.css";

const AUTOPLAY_MS = 6000;
const SWIPE_THRESHOLD = 40;
const MAX_PRODUCT_SLIDES = 5;

// Slide de marque : aucune photo d'archive, uniquement l'identité Kimoxa
// (logo + dégradé). Sert d'ouverture ET de repli quand le catalogue est vide.
const BRAND_SLIDE = {
  key: "brand",
  type: "brand",
  eyebrow: "Kimoxa",
  title: "La marketplace des commerçants du Burkina Faso",
  subtitle: "Des vendeurs vérifiés, près de chez vous.",
  href: "/shop",
  cta: "Découvrir le catalogue",
};

function formatFcfa(value) {
  const n = Number(value);
  return Number.isFinite(n) ? `${n.toLocaleString("fr-FR")} FCFA` : null;
}

// Construit les slides à partir des VRAIS produits du catalogue.
// Un produit n'est retenu que s'il a une image réelle envoyée par le vendeur :
// pas d'image = pas de slide (plutôt qu'un visuel générique de remplissage).
function buildSlides(products) {
  const productSlides = (Array.isArray(products) ? products : [])
    .filter((p) => p && Array.isArray(p.images) && p.images[0] && Number(p.stock_quantity) > 0)
    .slice(0, MAX_PRODUCT_SLIDES)
    .map((p) => ({
      key: `product-${p.id}`,
      type: "product",
      product: p,
      href: `/shop/${p.id}`,
    }));

  return [BRAND_SLIDE, ...productSlides];
}

export default function HeroCarousel({ featuredProducts = [] }) {
  const slides = buildSlides(featuredProducts);
  const count = slides.length;

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [broken, setBroken] = useState({});
  const touchX = useRef(null);
  const labelId = useId();

  const goTo = useCallback(
    (i) => setIndex(((i % count) + count) % count),
    [count]
  );

  // Respecte le réglage système "réduire les animations" : pas de défilement
  // automatique pour les personnes sensibles au mouvement (WCAG 2.3.3).
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  useEffect(() => {
    if (paused || reducedMotion || count < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [paused, reducedMotion, count]);

  function handleKeyDown(e) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(index - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(index + 1);
    }
  }

  return (
    <section
      className={styles.hero}
      role="region"
      aria-roledescription="carrousel"
      aria-labelledby={labelId}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      // Pause aussi à la navigation clavier : sans cela, le slide peut changer
      // sous les doigts de l'utilisateur pendant qu'il tabule (WCAG 2.2.2).
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false);
      }}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
        setPaused(true);
      }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - (touchX.current || 0);
        if (dx < -SWIPE_THRESHOLD) goTo(index + 1);
        if (dx > SWIPE_THRESHOLD) goTo(index - 1);
        touchX.current = null;
        setPaused(false);
      }}
    >
      <h2 id={labelId} className={styles.srOnly}>
        Sélection Kimoxa
      </h2>

      <div
        className={styles.viewport}
        aria-live={paused ? "polite" : "off"}
      >
        <div
          className={styles.track}
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((s, i) => {
            const active = i === index;
            const p = s.product;
            const discounted = p ? hasDiscount(p) : false;
            const rating = p ? Number(p.avg_rating) || 0 : 0;
            const reviews = p ? Number(p.review_count) || 0 : 0;
            const price = p ? formatFcfa(p.price) : null;
            const showImage = p && p.images?.[0] && !broken[s.key];

            return (
              <div
                key={s.key}
                className={styles.slide}
                role="group"
                aria-roledescription="diapositive"
                aria-label={`${i + 1} sur ${count}`}
                // inert retire du focus ET de l'arbre d'accessibilité les
                // slides masquées : corrige le conflit aria-hidden + lien
                // focusable de l'ancienne version.
                inert={active ? undefined : ""}
              >
                <div className={styles.copy}>
                  {s.type === "brand" ? (
                    <>
                      <span className={styles.eyebrow}>{s.eyebrow}</span>
                      <p className={styles.title}>{s.title}</p>
                      <p className={styles.subtitle}>{s.subtitle}</p>
                    </>
                  ) : (
                    <>
                      <span className={styles.eyebrow}>
                        {discounted ? `Promo -${discountPercent(p)}%` : "Nouveauté"}
                      </span>
                      <p className={styles.title}>{p.name}</p>
                      <div className={styles.meta}>
                        <span className={styles.shop}>
                          {p.shop_name || "Boutique Kimoxa"}
                          {p.shop_verified && (
                            <BadgeCheckIcon
                              size={13}
                              className={styles.verified}
                              aria-label="Vendeur vérifié"
                            />
                          )}
                        </span>
                        {reviews > 0 && (
                          <span className={styles.rating}>
                            <StarIcon size={12} className={styles.star} aria-hidden="true" />
                            {rating.toFixed(1)}
                            <span className={styles.reviews}>({reviews})</span>
                          </span>
                        )}
                      </div>
                      <p className={styles.priceRow}>
                        {discounted && (
                          <span className={styles.priceOld}>
                            {formatFcfa(p.compare_at_price)}
                          </span>
                        )}
                        <span className={styles.price}>
                          {price || "Prix indisponible"}
                        </span>
                      </p>
                    </>
                  )}

                  <Link className={styles.cta} href={s.href} tabIndex={active ? 0 : -1}>
                    {s.type === "brand" ? s.cta : "Voir le produit"}
                  </Link>
                </div>

                <div className={styles.visual}>
                  {showImage ? (
                    <Image
                      src={p.images[0]}
                      alt={p.name}
                      fill
                      className={styles.img}
                      sizes="(max-width: 767px) 45vw, 340px"
                      // Seule la 1re image est prioritaire : les suivantes ne
                      // doivent pas concurrencer le LCP de la page d'accueil.
                      priority={i === 1}
                      loading={i === 1 ? undefined : "lazy"}
                      onError={() => setBroken((b) => ({ ...b, [s.key]: true }))}
                    />
                  ) : (
                    <div className={styles.logoBox} aria-hidden="true">
                      <svg width="42" height="42" viewBox="0 0 64 64">
                        <path d="M10 4h16l9 9-11 11 11 11-9 9H10l11-11L10 21z" fill="#0F172A" />
                        <path d="M54 4L30 32l24 28H42L18 32 42 4z" fill="#D4AF37" />
                        <circle cx="31" cy="32" r="5" fill="#FFFFFF" />
                      </svg>
                      <span className={styles.logoWord}>KIMOXA</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            className={`${styles.arrow} ${styles.arrowPrev}`}
            onClick={() => goTo(index - 1)}
            aria-label="Diapositive précédente"
          >
            <ChevronLeftIcon size={18} />
          </button>
          <button
            type="button"
            className={`${styles.arrow} ${styles.arrowNext}`}
            onClick={() => goTo(index + 1)}
            aria-label="Diapositive suivante"
          >
            <ChevronRightIcon size={18} />
          </button>

          <div className={styles.dots}>
            {slides.map((s, i) => (
              <button
                key={s.key}
                type="button"
                className={i === index ? `${styles.dot} ${styles.dotActive}` : styles.dot}
                aria-label={`Aller à la diapositive ${i + 1}`}
                aria-current={i === index ? "true" : undefined}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
