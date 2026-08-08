import "./globals.css";
import ServiceWorker from "@/app/components/ServiceWorker";

export const metadata = {
  title: {
    default: "Kimoxa — Marketplace multi-vendeurs pour toute l'Afrique",
    template: "%s | Kimoxa",
  },
  description: "Kimoxa, la marketplace multi-vendeurs qui connecte l'Afrique qui vend à l'Afrique qui achète.",
  themeColor: "#241712",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        {/* PWA : enregistrement du service worker (production uniquement) */}
        <ServiceWorker />
        <meta name="theme-color" content="#241712" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Kimoxa" />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
        {children}
      </body>
    </html>
  );
}
