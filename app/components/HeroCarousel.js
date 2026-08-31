"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./HeroCarousel.module.css";

const SLIDES = [
  { id: "brand", eyebrow: "Kimoxa", title: "Le marketplace des commerçants du Burkina Faso.", subtitle: "Achetez local, soutenez local.", href: "/shop", cta: "Découvrir le catalogue", image: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800&q=80&auto=format&fit=crop", alt: "Marché local au Burkina Faso", pos: "50% 40%" },
  { id: "payments", eyebrow: "Confiance", title: "Payez en toute sécurité.", subtitle: "Mobile Money ou à la livraison, votre argent est protégé.", href: "/faq", cta: "Comment ça marche", image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&q=80&auto=format&fit=crop", alt: "Paiement mobile sécurisé", pos: "50% 50%" },
  { id: "delivery", eyebrow: "Livraison", title: "Livré chez vous, partout au Burkina.", subtitle: "Domicile ou retrait boutique, vous choisissez.", href: "/retours", cta: "En savoir plus", image: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=800&q=80&auto=format&fit=crop", alt: "Livraison à domicile", pos: "50% 40%" },
  { id: "vendor", eyebrow: "Vendeurs", title: "Vendez sur Kimoxa.", subtitle: "Ouvrez votre boutique en quelques minutes.", href: "/devenir-vendeur", cta: "Devenir vendeur", image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80&auto=format&fit=crop", alt: "Commerçante dans sa boutique", pos: "50% 30%" },
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
