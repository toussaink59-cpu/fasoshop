import { Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import "./tokens.css";

import { ToastProvider } from "@/lib/toast";
import Script from "next/script";
import ServiceWorker from "@/app/components/ServiceWorker";
import PwaInstallPrompt from "@/app/components/PwaInstallPrompt";
import WhatsAppFloat from "@/app/components/WhatsAppFloat";
import NotificationBell from "@/app/components/NotificationBell";

// Inter : police principale de toute l'interface.
const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

// IBM Plex Mono : chiffres, prix, statistiques et données tabulaires.
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["500"],
});

export const metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://kimoxa.com"
  ),
  title: {
    default: "Kimoxa — Marketplace multi-vendeurs pour toute l'Afrique",
    template: "%s | Kimoxa",
  },
  description:
    "Kimoxa, la marketplace multi-vendeurs qui connecte l'Afrique qui vend à l'Afrique qui achète.",
  openGraph: {
    siteName: "Kimoxa",
    type: "website",
    locale: "fr_FR",
    images: [
      {
        url: "/icons/icon-512.png",
        width: 512,
        height: 512,
        alt: "Kimoxa — la marketplace qui connecte l'Afrique",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Kimoxa — Marketplace multi-vendeurs",
    description: "Achetez local, soutenez local.",
    images: ["/icons/icon-512.png"],
  },
};

export const viewport = {
  themeColor: "#0d1220",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={`${inter.variable} ${ibmPlexMono.variable}`}>
      <body className="antialiased">
        <ServiceWorker />
        <PwaInstallPrompt />

        <meta name="theme-color" content="#0d1220" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="Kimoxa" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />

        {process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN && (
          <Script
            strategy="afterInteractive"
            data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
            src="https://plausible.io/js/script.js"
          />
        )}

        <ToastProvider>{children}</ToastProvider>

        <NotificationBell />
        <WhatsAppFloat />
      </body>
    </html>
  );
}