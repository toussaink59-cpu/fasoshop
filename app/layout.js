import "./globals.css";

export const metadata = {
  title: "FasoShop",
  description: "Marketplace multi-vendeur au Burkina Faso",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
