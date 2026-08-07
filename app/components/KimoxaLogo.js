// Symbole + wordmark de la marque Kimoxa (SVG vectoriel, couleurs de la charte :
// #0F172A navy, #D4AF37 or). `light` = true pour les fonds sombres.

export function KimoxaSymbol({ size = 26, light = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      style={{ flexShrink: 0, display: "inline-block", verticalAlign: "middle" }}
    >
      <path d="M10 4h16l9 9-11 11 11 11-9 9H10l11-11L10 21z" fill={light ? "#FFFFFF" : "#0F172A"} />
      <path d="M54 4L30 32l24 28H42L18 32 42 4z" fill="#D4AF37" />
      <circle cx="31" cy="32" r="5" fill={light ? "#0F172A" : "#FFFFFF"} />
    </svg>
  );
}

export default function KimoxaLogo({ light = false, size = 26, withTagline = false }) {
  return (
    <span className="kimoxa-logo">
      <KimoxaSymbol size={size} light={light} />
      <span className="kimoxa-logo-text">
        <span className={`kimoxa-wordmark ${light ? "is-light" : ""}`}>KIMOXA</span>
        {withTagline && (
          <span className="kimoxa-tagline">Connecter · Innover · Prospérer</span>
        )}
      </span>
    </span>
  );
}
