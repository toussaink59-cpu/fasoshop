"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./HeroCarousel.module.css";

const SLIDES = [
  { id: "brand", eyebrow: "Kimoxa", title: "Le marketplace des commerçants du Burkina Faso.", subtitle: "Achetez local, soutenez local.", href: "/shop", cta: "Découvrir le catalogue" },
  { id: "shops", eyebrow: "Boutiques locales", title: "Des boutiques locales vérifiées.", subtitle: "Mode, beauté, électronique, maison : tout un marché dans votre poche.", href: "/nos-vendeurs", cta: "Voir les vendeurs", image: "/hero/shops.png", alt: "Boutiques locales au Burkina Faso" },
  { id: "payments", eyebrow: "Confiance", title: "Payez en toute sécurité.", subtitle: "Orange Money, Moov Money, MTN MoMo, Wave ou à la livraison.", href: "/faq", cta: "Comment ça marche", image: "/hero/payments.png", alt: "Paiement mobile sécurisé" },
  { id: "delivery", eyebrow: "Livraison", title: "Livré chez vous ou retrait en boutique.", subtitle: "Le vendeur livre à votre adresse, ou retrait gratuit sur place.", href: "/retours", cta: "En savoir plus", image: "/hero/delivery.png", alt: "Livraison à domicile", pos: "50% 25%" },
  { id: "vendor", eyebrow: "Vendeurs", title: "Vendez sur Kimoxa.", subtitle: "Ouvrez votre boutique en quelques minutes, touchez tout le Burkina.", href: "/devenir-vendeur", cta: "Devenir vendeur", image: "/hero/vendor.png", alt: "Commerçant partenaire Kimoxa", pos: "50% 20%" },
];

export default function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [broken, setBroken] = useState({});
  const touchX = useRef(null);

  const goTo = useCallback((i) => setIndex(((i % SLIDES.length) + SLIDES.length) % SLIDES.length), []);

  useEffect(() => {
    if (paused || SLIDES.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 6000);
    return () => clearInterval(t);
  }, [paused]);

  return (
    <section
      className={styles.hero}
      role="region"
      aria-roledescription="carrousel"
      aria-label="Kimoxa en bref"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; setPaused(true); }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - (touchX.current || 0);
        if (dx < -40) goTo(index + 1);
        if (dx > 40) goTo(index - 1);
        touchX.current = null;
        setPaused(false);
      }}
    >
      <div className={styles.track} style={{ transform: "translateX(-" + index * 100 + "%)" }}>
        {SLIDES.map((s, i) => (
          <div key={s.id} className={styles.slide} aria-hidden={i !== index}>
            <div className={styles.copy}>
              <span className={styles.eyebrow}>{s.eyebrow}</span>
              <h2 className={styles.title}>{s.title}</h2>
              <p className={styles.subtitle}>{s.subtitle}</p>
              <Link className={styles.cta} href={s.href}>{s.cta}</Link>
            </div>
            <div className={styles.visual}>
              {s.image && !broken[s.id] ? (
                <Image src={s.image} alt={s.alt} fill className={styles.imgCover} style={{ objectPosition: s.pos || "50% 50%" }} sizes="(max-width:640px) 45vw, 35vw" onError={() => setBroken((b) => ({ ...b, [s.id]: true }))} />
              ) : (
                <div className={styles.logoBox}>
                  <svg width="38" height="38" viewBox="0 0 64 64" aria-hidden="true">
                    <path d="M10 4h16l9 9-11 11 11 11-9 9H10l11-11L10 21z" fill="#0F172A"></path>
                    <path d="M54 4L30 32l24 28H42L18 32 42 4z" fill="#D4AF37"></path>
                    <circle cx="31" cy="32" r="5" fill="#FFFFFF"></circle>
                  </svg>
                  <span className={styles.logoWord}>KIMOXA</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className={styles.dots}>
        {SLIDES.map((s, i) => (
          <button key={s.id} type="button" aria-label={"Aller à la diapositive " + (i + 1)} className={i === index ? styles.dot + " " + styles.active : styles.dot} onClick={() => goTo(i)} />
        ))}
      </div>
    </section>
  );
}
