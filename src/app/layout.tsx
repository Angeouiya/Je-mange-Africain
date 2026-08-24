import type { Metadata, Viewport } from "next";
import { Poppins, Caveat } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StoreProvider } from "@/lib/store-provider";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://je-mange-africain.vercel.app"),
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
    icon: "/logo-jma.png",
    apple: "/logo-jma.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "JMA",
  },
  openGraph: {
    title: "Je mange Africain",
    description: "Authentic African cooking essentials, delivered to your door.",
    siteName: "Je mange Africain",
    type: "website",
    locale: "fr_FR",
    alternateLocale: ["en_US"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Je mange Africain",
    description: "Authentic African cooking essentials, delivered to your door.",
  },
};

export const viewport: Viewport = {
  themeColor: "#D65A32",
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
        className={`${poppins.variable} ${caveat.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        <StoreProvider>
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        </StoreProvider>
        <Toaster />
        <Sonner position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
