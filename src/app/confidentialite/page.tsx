import type { Metadata } from "next";
import { PublicLegalPage } from "@/components/storefront/PublicLegalPage";

export const metadata: Metadata = {
  title: "Politique de confidentialité - Je mange Africain",
  description: "Politique de confidentialité et protection des données personnelles de Je mange Africain.",
};

export default async function PrivacyPage({ searchParams }: { searchParams: Promise<{ lang?: string | string[] }> }) {
  const params = await searchParams;
  const locale = params.lang === "en" ? "en" : "fr";
  return <PublicLegalPage kind="privacy" locale={locale} pathname="/confidentialite" />;
}
