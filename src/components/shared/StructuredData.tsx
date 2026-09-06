import type { Organization, WebSite, WithContext } from "schema-dts";
import { COMPANY_PROFILE } from "@/lib/company-profile";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://je-mange-africain.com";

const organization: WithContext<Organization> = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${siteUrl}/#organization`,
  name: COMPANY_PROFILE.brandName,
  legalName: COMPANY_PROFILE.legalName,
  url: siteUrl,
  logo: `${siteUrl}/brand/app-icon-512-burgundy.png`,
  email: process.env.NEXT_PUBLIC_COMPANY_EMAIL || COMPANY_PROFILE.email,
  telephone: process.env.NEXT_PUBLIC_COMPANY_PHONE || COMPANY_PROFILE.locations.france.phoneDisplay,
  address: {
    "@type": "PostalAddress",
    streetAddress: COMPANY_PROFILE.locations.france.streetAddress,
    postalCode: COMPANY_PROFILE.locations.france.postalCode,
    addressLocality: COMPANY_PROFILE.locations.france.city,
    addressCountry: "FR",
  },
  areaServed: ["France", "Belgium", "Germany", "Netherlands", "Luxembourg"],
  knowsLanguage: ["fr-FR", "en-GB"],
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "customer support - Europe",
      email: process.env.NEXT_PUBLIC_COMPANY_EMAIL || COMPANY_PROFILE.email,
      telephone: COMPANY_PROFILE.locations.france.phoneDisplay,
      areaServed: "FR",
      availableLanguage: ["French", "English"],
    },
    {
      "@type": "ContactPoint",
      contactType: "customer support - Côte d'Ivoire",
      email: process.env.NEXT_PUBLIC_COMPANY_EMAIL || COMPANY_PROFILE.email,
      telephone: COMPANY_PROFILE.locations.ivoryCoast.phoneDisplay,
      areaServed: "CI",
      availableLanguage: ["French"],
    },
  ],
};

const website = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${siteUrl}/#website`,
  url: siteUrl,
  name: "Je mange Africain",
  inLanguage: ["fr-FR", "en-GB"],
  publisher: { "@id": `${siteUrl}/#organization` },
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${siteUrl}/?view=catalog&query={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
} as WithContext<WebSite>;

export function StructuredData() {
  return <>{[organization, website].map((data) => <script key={String(data["@id"])} type="application/ld+json" dangerouslySetInnerHTML={{ __html: serialize(data) }} />)}</>;
}

function serialize(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
