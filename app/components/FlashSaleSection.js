"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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

export default function FlashSaleSection() {
  const [products, setProducts] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/flash-sales")
      .then((r) => r.json())
      .then((d) => {
        setProducts(d.products || []);
        setLoaded(true);
      });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!loaded || products.length === 0) return null;

  const soonestEnd = Math.min(...products.map((p) => new Date(p.flash_sale_ends_at).getTime()));
  const remaining = soonestEnd - now;

  return (
    <div className="flash-section">
      <div className="flash-header">
        <div className="flash-title">
          <span className="flash-lightning">⚡</span>
          <h2>Ventes Flash</h2>
        </div>
        <div className="flash-timer">
          Termine dans <strong>{formatCountdown(remaining)}</strong>
        </div>
      </div>

      <div className="flash-grid">
        {products.map((p) => {
          const snapshot = p.flash_sale_stock_snapshot;
          const soldRatio = snapshot
            ? Math.min(100, Math.round(((snapshot - p.stock_quantity) / snapshot) * 100))
            : 0;
          return (
            <Link href="/shop" key={p.id} className="flash-card" style={{ textDecoration: "none" }}>
              {hasDiscount(p) && (
                <span className="badge-discount">-{discountPercent(p)}%</span>
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
    </div>
  );
}
