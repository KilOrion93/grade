import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "TrustReview — Avis vérifiés pour restaurants",
  description:
    "Collectez des avis clients vérifiés pour votre restaurant. QR code, preuve de visite, analytics en temps réel.",
  keywords: ["avis restaurant", "avis vérifiés", "QR code", "feedback client"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] antialiased">
        {children}
      </body>
    </html>
  );
}
