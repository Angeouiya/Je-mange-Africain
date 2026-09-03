import type { Metadata, Viewport } from "next";
import { Manrope, Fraunces } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StoreProvider } from "@/lib/store-provider";
import { StructuredData } from "@/components/shared/StructuredData";
import { PwaRegistration } from "@/components/shared/PwaRegistration";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL("https://je-mange-africain.com"),
  applicationName: "Je mange Africain",
  title: "Je mange Africain — Épicerie africaine authentique livrée chez vous",
  description:
    "Tous les produits authentiques de la cuisine africaine, livrés chez vous. Moteur de recettes intelligentes, placali, attiéké, graine de palme, gombo, kplô et plus.",
  keywords: [
    "Je mange Africain",
    "épicerie africaine",
    "placali",
    "attiéké",
    "graine de palme",
    "gombo",
    "cuisine africaine",
    "recettes africaines",
  ],
  authors: [{ name: "Je mange Africain" }],
  icons: {
    icon: [
      { url: "/brand/app-icon-192-burgundy.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/app-icon-512-burgundy.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/brand/apple-touch-icon-burgundy.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Je mange Africain",
  },
  openGraph: {
    title: "Je mange Africain",
    description: "Authentic African cooking essentials, delivered to your door.",
    siteName: "Je mange Africain",
    type: "website",
    locale: "fr_FR",
    alternateLocale: ["en_US"],
    images: [{ url: "/hero-feast-v2.webp", alt: "Cuisine africaine authentique Je mange Africain" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Je mange Africain",
    description: "Authentic African cooking essentials, delivered to your door.",
    images: ["/hero-feast-v2.webp"],
  },
  alternates: {
    canonical: "/",
    languages: { "fr-FR": "/", "en-GB": "/?lang=en", "x-default": "/" },
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#B74325",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${manrope.variable} ${fraunces.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        <StructuredData />
        <PwaRegistration />
        <StoreProvider>
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
