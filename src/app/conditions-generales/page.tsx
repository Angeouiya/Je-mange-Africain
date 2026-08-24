import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LegalDocument } from "@/components/storefront/LegalDocument";

export const metadata: Metadata = {
  title: "CGU et CGV - Je mange Africain",
  description: "Conditions générales d'utilisation et de vente de Je mange Africain.",
};

export default function TermsPage() {
  return (
    <main className="jma-shell min-h-screen px-4 py-6">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="mb-6 inline-flex items-center gap-3 text-sm font-semibold text-charcoal">
          <Image src="/logo-jma.png" alt="Je mange Africain" width={72} height={72} className="h-12 w-12 object-contain" />
          Je mange Africain
        </Link>
        <div className="jma-card rounded-2xl p-5 md:p-8">
          <LegalDocument kind="terms" locale="fr" />
        </div>
      </div>
    </main>
  );
}

