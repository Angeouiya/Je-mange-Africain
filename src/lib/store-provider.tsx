"use client";

import { useEffect, useState } from "react";
import { useStore } from "./store";
import type { Locale } from "./i18n";

const viewTitles = {
  fr: {
    home: "Je mange Africain - Épicerie africaine premium",
    catalog: "Marché africain | Je mange Africain",
    wholesale: "Marché de gros | Je mange Africain",
    product: "Produit africain | Je mange Africain",
    recipes: "Recettes africaines | Je mange Africain",
    "recipe-config": "Configurateur de recette | Je mange Africain",
    cart: "Mon panier | Je mange Africain",
    checkout: "Paiement sécurisé | Je mange Africain",
    "order-confirmation": "Commande confirmée | Je mange Africain",
    orders: "Mes commandes | Je mange Africain",
    "order-tracking": "Suivi de commande | Je mange Africain",
    account: "Mon compte | Je mange Africain",
    info: "Informations et assistance | Je mange Africain",
  },
  en: {
    home: "Je mange Africain - Premium African grocery",
    catalog: "African market | Je mange Africain",
    wholesale: "Wholesale market | Je mange Africain",
    product: "African product | Je mange Africain",
    recipes: "African recipes | Je mange Africain",
    "recipe-config": "Recipe configurator | Je mange Africain",
    cart: "My basket | Je mange Africain",
    checkout: "Secure checkout | Je mange Africain",
    "order-confirmation": "Order confirmed | Je mange Africain",
    orders: "My orders | Je mange Africain",
    "order-tracking": "Order tracking | Je mange Africain",
    account: "My account | Je mange Africain",
    info: "Information and support | Je mange Africain",
  },
} as const;

const routeTitles = {
  fr: {
    terms: "Conditions générales | Je mange Africain",
    privacy: "Politique de confidentialité | Je mange Africain",
    reset: "Nouveau mot de passe | Je mange Africain",
  },
  en: {
    terms: "Terms and conditions | Je mange Africain",
    privacy: "Privacy policy | Je mange Africain",
    reset: "New password | Je mange Africain",
  },
} as const;

function titleForLocation(locale: Locale, view: keyof (typeof viewTitles)["fr"]) {
  if (window.location.pathname === "/conditions-generales") return routeTitles[locale].terms;
  if (window.location.pathname === "/confidentialite") return routeTitles[locale].privacy;
  if (window.location.pathname === "/auth/reset") return routeTitles[locale].reset;
  return viewTitles[locale][view];
}

/**
 * Ensures the persisted store is hydrated before rendering children,
 * preventing hydration mismatches between server and client.
 * Hydration is handled by Zustand persist's onRehydrateStorage; this
 * provider just warms the store reference so SSR + client stay in sync.
 */
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const locale = useStore((state) => state.locale);
  const view = useStore((state) => state.view);
  const [documentLocale, setDocumentLocale] = useState<Locale>("fr");
  const [documentTitle, setDocumentTitle] = useState<string | null>(null);

  useEffect(() => {
    if (window.location.pathname.startsWith("/admin")) return;
    const explicitLocale = new URLSearchParams(window.location.search).get("lang");
    const nextLocale: Locale = explicitLocale === "en" || explicitLocale === "fr" ? explicitLocale : locale;
    const nextTitle = titleForLocation(nextLocale, view);
    setDocumentLocale(nextLocale);
    setDocumentTitle(nextTitle);
    document.documentElement.lang = nextLocale;
    document.documentElement.dir = "ltr";
    const syncTitle = () => {
      if (document.title !== nextTitle) document.title = nextTitle;
    };
    syncTitle();

    // Next can reconcile server metadata after hydration. Keep the client-side
    // view title authoritative for this single-page storefront.
    const observer = new MutationObserver(syncTitle);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [locale, view]);

  useEffect(() => {
    const syncExternalLocale = (event: Event) => {
      const nextLocale = (event as CustomEvent<Locale>).detail;
      if (nextLocale === "fr" || nextLocale === "en") setDocumentLocale(nextLocale);
    };
    window.addEventListener("jma-document-locale", syncExternalLocale);
    return () => window.removeEventListener("jma-document-locale", syncExternalLocale);
  }, []);

  return (
    <>
      {documentTitle ? <title>{documentTitle}</title> : null}
      <a href="#main-content" className="jma-skip-link">
        {documentLocale === "fr" ? "Aller au contenu principal" : "Skip to main content"}
      </a>
      {children}
    </>
  );
}
