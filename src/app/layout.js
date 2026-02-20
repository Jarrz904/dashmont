import "./globals.css";

export const metadata = {
  title: "Dashboard Monitoring Layanan",
  description: "Aplikasi Statistik Capaian Layanan",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        {/* children adalah tempat di mana page.js Anda akan dirender */}
        {children}
      </body>
    </html>
  );
}