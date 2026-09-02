import type { Metadata } from "next";
import { PublicLegalPage } from "@/components/storefront/PublicLegalPage";

export const metadata: Metadata = {
  title: "CGU et CGV - Je mange Africain",
  description: "Conditions générales d'utilisation et de vente de Je mange Africain.",
};

export default async function TermsPage({ searchParams }: { searchParams: Promise<{ lang?: string | string[] }> }) {
  const params = await searchParams;
  const locale = params.lang === "en" ? "en" : "fr";
  return <PublicLegalPage kind="terms" locale={locale} pathname="/conditions-generales" />;
}
