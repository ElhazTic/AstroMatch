import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "AstroMatch - Analyse de compatibilité amoureuse par IA",
  description:
    "Découvrez votre compatibilité amoureuse en 30 secondes grâce à l'IA, l'astrologie et la psychologie relationnelle. Test gratuit + rapport PDF complet.",
  keywords: [
    "compatibilité amoureuse",
    "astrologie",
    "test couple",
    "analyse IA",
    "psychologie relationnelle",
    "compatibilité signes",
    "AstroMatch",
  ],
  authors: [{ name: "AstroMatch" }],
  openGraph: {
    title: "AstroMatch - Analyse de compatibilité amoureuse par IA",
    description:
      "Découvrez votre compatibilité amoureuse en 30 secondes grâce à l'IA, l'astrologie et la psychologie relationnelle.",
    type: "website",
    locale: "fr_FR",
    siteName: "AstroMatch",
  },
  twitter: {
    card: "summary_large_image",
    title: "AstroMatch - Analyse de compatibilité amoureuse par IA",
    description:
      "Découvrez votre compatibilité amoureuse en 30 secondes grâce à l'IA, l'astrologie et la psychologie relationnelle.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-slate-50`}
      >
        {children}
      </body>
    </html>
  );
}
