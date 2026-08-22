"use client";

import { ZapIcon, ShoppingBagIcon } from "@/app/components/Icons";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import PriceDisplay, { hasDiscount, discountPercent } from "@/app/components/PriceDisplay";

function formatCountdown(ms) {
  if (ms <= 0) return "00h : 00m : 00s";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(hours)}h : ${pad(minutes)}m : ${pad(seconds)}s`;
}

export default function FlashSaleSection({ initialProducts = [] }) {
  const [products] = useState(initialProducts);
  const [now, setNow] = useState(Date.now());
  const scrollRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  function scrollByAmount(amount) {
    scrollRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  }

  if (products.length === 0) return null;

  const soonestEnd = Math.min(...products.map((p) => new Date(p.flash_sale_ends_at).getTime()));
  const remaining = soonestEnd - now;

  return (
    <div className="flash-section">
      <div className="flash-header">
        <div className="flash-title">
          <span className="flash-lightning" style={{ display: "inline-flex", color: "var(--gold-600)" }}><ZapIcon size={20} /></span>
          <h2>Vente Flash</h2>
        </div>
        <div className="flash-timer">
          Termine dans <strong>{formatCountdown(remaining)}</strong>
        </div>
        <Link href="/shop?sort=newest" className="section-see-all flash-see-all">Voir tout →</Link>
      </div>

      <div className="flash-scroll-wrap">
        <button
          type="button"
          className="flash-scroll-arrow flash-scroll-arrow-left"
          onClick={() => scrollByAmount(-320)}
          aria-label="Précédent"
        >
          ‹
        </button>

        <div className="flash-scroll-track" ref={scrollRef}>
          {products.map((p) => {
            const snapshot = p.flash_sale_stock_snapshot;
            const soldRatio = snapshot
              ? Math.min(100, Math.round(((snapshot - p.stock_quantity) / snapshot) * 100))
              : 0;
            return (
              <Link href={`/shop/${p.id}`} key={p.id} className="flash-card" style={{ textDecoration: "none" }}>
                {hasDiscount(p) && (
                  <span className="badge-discount">-{discountPercent(p)}%</span>
                )}
                {p.images && p.images.length > 0 ? (
                  <Image
                    src={p.images[0]}
                    alt={p.name}
                    width={320}
                    height={320}
                    sizes="(max-width: 700px) 45vw, 260px"
                    className="flash-card-image"
                    loading="lazy"
                  />
                ) : (
                  <div className="flash-card-image flash-card-image-placeholder" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-300)" }}><ShoppingBagIcon size={48} /></div>
                )}
                <div className="name">{p.name}</div>
                <div className="shop">{p.shop_name}</div>
                <PriceDisplay product={p} />
                {snapshot ? (
                  <div className="flash-stock-bar">
                    <div className="flash-stock-track">
                      <div className="flash-stock-fill" style={{ width: `${soldRatio}%` }} />
                    </div>
                    <span className="flash-stock-label">{p.stock_quantity} restants</span>
                  </div>
                ) : null}
              </Link>
            );
          })}
        </div>

        <button
          type="button"
          className="flash-scroll-arrow flash-scroll-arrow-right"
          onClick={() => scrollByAmount(320)}
          aria-label="Suivant"
        >
          ›
        </button>
      </div>
    </div>
  );
}