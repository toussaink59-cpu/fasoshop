import Link from "next/link";

export default function Footer() {
  return (
    <footer
      style={{
        marginTop: 48,
        borderTop: "1px solid var(--sand-200)",
        padding: "32px 24px",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-between",
        gap: 24,
        fontSize: "0.9rem",
      }}
    >
      <div>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>🛒 FasoShop</div>
        <p style={{ color: "var(--ink-400)", maxWidth: 260, margin: 0 }}>
          La marketplace qui connecte les boutiques du Burkina Faso à leurs clients, partout au pays.
        </p>
      </div>

      <div>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Vendeurs</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Link href="/devenir-vendeur">Devenir vendeur</Link>
          <Link href="/nos-vendeurs">Nos vendeurs</Link>
        </div>
      </div>

      <div>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Informations</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Link href="/cgv">Conditions générales de vente</Link>
          <Link href="/retours">Politique de retour</Link>
          <Link href="/faq">FAQ</Link>
        </div>
      </div>

      <div style={{ width: "100%", borderTop: "1px solid var(--sand-200)", paddingTop: 16, color: "var(--ink-400)", fontSize: "0.8rem" }}>
        © {new Date().getFullYear()} FasoShop — Ouagadougou, Burkina Faso
      </div>
    </footer>
  );
}
