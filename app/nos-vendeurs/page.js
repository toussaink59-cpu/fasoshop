import Link from "next/link";
import Footer from "@/app/components/Footer";
import SiteHeader from "@/app/components/SiteHeader";
import BottomNav from "@/app/components/BottomNav";
import { getCurrentUser } from "@/lib/session";
import { getCategoriesTree } from "@/lib/queries/categories";
import { getShopsDirectory } from "@/lib/queries/shops";

export const metadata = {
  title: "Nos vendeurs",
  description: "Des boutiques locales vérifiées, présentes partout au Burkina Faso.",
};

export default async function NosVendeursPage() {
  const [user, categories, shops] = await Promise.all([
    getCurrentUser(),
    getCategoriesTree(),
    getShopsDirectory(),
  ]);

  return (
    <div className="shell">
      <SiteHeader initialUser={user} categories={categories} />

      <div className="content">
        <div className="page-header">
          <h1>Nos vendeurs</h1>
          <p>Des boutiques locales vérifiées, présentes partout au Burkina Faso.</p>
        </div>

        {shops.length === 0 ? (
          <div className="empty-state">
            <div className="glyph">🏪</div>
            <p>Aucune boutique active pour l'instant.</p>
          </div>
        ) : (
          <div className="product-grid">
            {shops.map((s) => (
              <Link
                key={s.id}
                href={`/shop?shopId=${s.id}`}
                className="product-card"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div className="name">🏪 {s.name}</div>
                <div className="shop">{s.vendor_name}</div>
                <div style={{ marginTop: 6, fontSize: "0.9rem" }}>
                  {Number(s.review_count) > 0 ? (
                    <>⭐ {s.avg_rating} ({s.review_count} avis)</>
                  ) : (
                    <span style={{ color: "var(--ink-400)" }}>Pas encore d'avis</span>
                  )}
                </div>
                <div style={{ color: "var(--ink-400)", fontSize: "0.85rem" }}>
                  {s.product_count} produit{s.product_count > 1 ? "s" : ""}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Footer />
      <BottomNav user={user} />
    </div>
  );
}
