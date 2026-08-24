"use client";

import { StoreIcon, BadgeCheckIcon, MapPinIcon, PackageIcon, FlameIcon } from "@/app/components/Icons";
import Link from "next/link";
import Image from "next/image";
import SiteHeader from "@/app/components/SiteHeader";
import BottomNav from "@/app/components/BottomNav";
import PriceDisplay, { hasDiscount, discountPercent } from "@/app/components/PriceDisplay";

export default function ShopClient({ shop, products, initialUser, categories }) {
  const since = shop.created_at
    ? new Date(shop.created_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
    : null;

  return (
    <div className="shell">
      <SiteHeader initialUser={initialUser} categories={categories} />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px" }}>
        <Link
          href="/shop"
          style={{ fontSize: "0.85rem", color: "var(--ink-600)", textDecoration: "none", display: "inline-block", marginBottom: 12 }}
        >
          ← Retour au catalogue
        </Link>

        {/* ===== Bannière boutique (nom visible + cohérent) ===== */}
        <div
          style={{
            background: "var(--cream-100, #faf7f2)",
            border: "1px solid var(--border, #e5e5e5)",
            borderRadius: 14,
            padding: 20,
            marginBottom: 20,
            display: "flex",
            gap: 16,
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "var(--gold-600, #c9a44c)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.8rem",
              flexShrink: 0,
            }}
          >
            
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.4rem", color: "var(--ink-900)" }}>
              {shop.name}{" "}
              <span style={{ color: "var(--gold-600, #c9a44c)", fontWeight: 700 }} title="Boutique vérifiée">
                
              </span>
            </h1>
            <div style={{ color: "var(--ink-600)", fontSize: "0.85rem", marginTop: 4 }}>
              {shop.city && <> {shop.city} · </>}
              {since && <>Sur Kimoxa depuis {since}</>}
            </div>
            {shop.description && (
              <p style={{ margin: "8px 0 0", fontSize: "0.9rem", color: "var(--ink-700)" }}>
                {shop.description}
              </p>
            )}
          </div>
        </div>

        {/* ===== Produits de la boutique ===== */}
        <h2 style={{ fontSize: "1.05rem", marginBottom: 12, color: "var(--ink-900)" }}>
           Produits de la boutique ({products.length})
        </h2>

        {products.length === 0 ? (
          <div className="empty-state">
            <div className="glyph"></div>
            <p>Cette boutique n'a pas encore de produits actifs.</p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 14,
            }}
          >
            {products.map((p) => (
              <Link key={p.id} href={`/shop/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid var(--border, #e5e5e5)",
                    borderRadius: 12,
                    overflow: "hidden",
                    position: "relative",
                    height: "100%",
                  }}
                >
                  {hasDiscount(p) && (
                    <span
                      style={{
                        position: "absolute",
                        top: 8,
                        left: 8,
                        background: "var(--bissap-600, #a4243b)",
                        color: "#fff",
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: 999,
                        zIndex: 1,
                      }}
                    >
                      -{discountPercent(p)}%
                    </span>
                  )}
                  <div style={{ aspectRatio: "1", background: "var(--cream-100, #faf7f2)" }}>
                    {p.images && p.images[0] ? (
                      <Image
                        src={p.images[0]}
                        alt={p.name}
                        width={400}
                        height={400}
                        sizes="(max-width: 600px) 50vw, 25vw"
                        loading="lazy"
                        unoptimized
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem" }}>
                        
                      </div>
                    )}
                  </div>
                  <div style={{ padding: "10px 12px 12px" }}>
                    <div
                      style={{
                        fontSize: "0.88rem",
                        fontWeight: 600,
                        marginBottom: 6,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        color: "var(--ink-900)",
                      }}
                    >
                      {p.name}
                    </div>
                    <PriceDisplay product={p} />
                    {p.stock_quantity > 0 && p.stock_quantity <= 5 && (
                      <div style={{ fontSize: "0.7rem", color: "var(--bissap-600, #a4243b)", fontWeight: 600, marginTop: 4 }}>
                         Plus que {p.stock_quantity} !
                      </div>
                    )}
                    {p.stock_quantity <= 0 && (
                      <div style={{ fontSize: "0.7rem", color: "var(--ink-400)", fontWeight: 600, marginTop: 4 }}>
                        Rupture
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <BottomNav user={initialUser} />
    </div>
  );
}