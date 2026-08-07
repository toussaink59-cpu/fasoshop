import "./globals.css";

export const metadata = {
  title: {
    default: "Kimoxa — Marketplace multi-vendeurs pour toute l'Afrique",
    template: "%s | Kimoxa",
  },
  description: "Kimoxa, la marketplace multi-vendeurs qui connecte l'Afrique qui vend à l'Afrique qui achète.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
