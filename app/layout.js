import "./globals.css";
import { Fraunces, Work_Sans, IBM_Plex_Mono } from "next/font/google";
import Script from "next/script";
import ServiceWorker from "@/app/components/ServiceWorker";
import PwaInstallPrompt from "@/app/components/PwaInstallPrompt";
import WhatsAppFloat from "@/app/components/WhatsAppFloat";
import NotificationBell from "@/app/components/NotificationBell";

// Perf : polices auto-hébergées par next/font au build. Plus de requête
// vers fonts.googleapis.com au chargement de la page, et aucun FOUT.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal"],
  display: "swap",
  variable: "--font-fraunces",
});
const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-work-sans",
});
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500"],
  display: "swap",
  variable: "--font-ibm-plex-mono",
});

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://kimoxa.com"),
  title: {
    default: "Kimoxa — Marketplace multi-vendeurs pour toute l'Afrique",
    template: "%s | Kimoxa",
  },
  description: "Kimoxa, la marketplace multi-vendeurs qui connecte l'Afrique qui vend à l'Afrique qui achète.",
  openGraph: {
    siteName: "Kimoxa",
    type: "website",
    locale: "fr_FR",
  },
};
export const viewport = {
  themeColor: "#241712",
};
export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={`${fraunces.variable} ${workSans.variable} ${ibmPlexMono.variable}`}>
      <body>
        <ServiceWorker />
        <PwaInstallPrompt />
        <meta name="theme-color" content="#241712" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Kimoxa" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        {process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN && (
          <Script
            strategy="afterInteractive"
            data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
            src="https://plausible.io/js/script.js"
          />
        )}
        {children}
            <NotificationBell />
        <WhatsAppFloat />
    </body>
    </html>
  );
}
