import type { Organization, WebSite, WithContext } from "schema-dts";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://je-mange-africain.com";

const organization: WithContext<Organization> = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${siteUrl}/#organization`,
  name: "Je mange Africain",
  url: siteUrl,
  logo: `${siteUrl}/brand/app-icon-512.png`,
  email: process.env.NEXT_PUBLIC_COMPANY_EMAIL || "bonjour@je-mange-africain.com",
  areaServed: ["France", "Belgium", "Germany", "Netherlands", "Luxembourg"],
  knowsLanguage: ["fr-FR", "en-GB"],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    email: process.env.NEXT_PUBLIC_COMPANY_EMAIL || "bonjour@je-mange-africain.com",
    availableLanguage: ["French", "English"],
  },
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
