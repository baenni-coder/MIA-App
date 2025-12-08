import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MIA-App | Jahresplanung für Lehrpersonen",
  description: "Jahresplanung für Medien, Informatik und Anwendungskompetenzen",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
