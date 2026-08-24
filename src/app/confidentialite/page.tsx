import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument } from "@/components/storefront/LegalDocument";
import { BrandLockup } from "@/components/shared/BrandLockup";

export const metadata: Metadata = {
  title: "Politique de confidentialité - Je mange Africain",
  description: "Politique de confidentialité et protection des données personnelles de Je mange Africain.",
};

export default function PrivacyPage() {
  return (
    <main className="jma-shell min-h-screen px-4 py-6">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="mb-6 inline-flex items-center gap-3 text-sm font-semibold text-charcoal">
          <BrandLockup />
        </Link>
        <div className="jma-card rounded-2xl p-5 md:p-8">
          <LegalDocument kind="privacy" locale="fr" />
        </div>
      </div>
    </main>
  );
}
