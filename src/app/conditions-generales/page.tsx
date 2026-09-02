import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument } from "@/components/storefront/LegalDocument";
import { BrandLockup } from "@/components/shared/BrandLockup";

export const metadata: Metadata = {
  title: "CGU et CGV - Je mange Africain",
  description: "Conditions générales d'utilisation et de vente de Je mange Africain.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white px-4 py-6 md:py-10">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="mb-6 inline-flex items-center gap-3 text-sm font-semibold text-charcoal">
          <BrandLockup />
        </Link>
        <div className="border-t border-charcoal/10 pt-6 md:pt-8">
          <LegalDocument kind="terms" locale="fr" />
        </div>
      </div>
    </main>
  );
}
