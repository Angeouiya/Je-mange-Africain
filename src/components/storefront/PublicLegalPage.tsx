import Link from "next/link";
import { ArrowLeft, Globe2, Mail } from "lucide-react";
import { BrandLockup } from "@/components/shared/BrandLockup";
import { DocumentLocaleSync } from "@/components/shared/DocumentLocaleSync";
import { LegalDocument, type LegalKind } from "@/components/storefront/LegalDocument";
import type { Locale } from "@/lib/i18n";

const copy = {
  fr: {
    back: "Retour à l'application",
    language: "Langue du document",
    legal: "Documents légaux",
    terms: "Conditions générales",
    privacy: "Confidentialité",
    contact: "Une question sur ce document ?",
  },
  en: {
    back: "Back to the application",
    language: "Document language",
    legal: "Legal documents",
    terms: "Terms and conditions",
    privacy: "Privacy",
    contact: "A question about this document?",
  },
} as const;

export function PublicLegalPage({ kind, locale, pathname }: { kind: LegalKind; locale: Locale; pathname: string }) {
  const text = copy[locale];

  return (
    <main className="min-h-screen bg-white text-charcoal">
      <DocumentLocaleSync locale={locale} />
      <div className="african-kente-stripe h-[3px]" />
      <header className="sticky top-0 z-30 border-b border-border bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center gap-2 px-4 sm:gap-4 lg:px-6">
          <Link href="/" aria-label={text.back} title={text.back} className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-border text-charcoal transition hover:border-terre hover:text-terre">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Link href="/" className="min-w-0 flex-1" aria-label="Je mange Africain">
            <BrandLockup compact responsive locale={locale} />
          </Link>
          <nav aria-label={text.language} className="flex shrink-0 items-center gap-1 rounded-md border border-border bg-muted/45 p-1">
            <Globe2 className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            {(["fr", "en"] as const).map((language) => (
              <Link key={language} href={`${pathname}?lang=${language}`} hrefLang={language} aria-current={locale === language ? "page" : undefined} className={`grid h-8 min-w-9 place-items-center rounded px-2 text-[10px] font-black transition ${locale === language ? "bg-burgundy text-white" : "text-muted-foreground hover:bg-white hover:text-charcoal"}`}>
                {language.toUpperCase()}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-7 sm:py-10 lg:px-6">
        <LegalDocument kind={kind} locale={locale} />
      </div>

      <footer className="border-t border-border bg-muted/30">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 text-xs sm:flex-row sm:items-center sm:justify-between lg:px-6">
          <nav aria-label={text.legal} className="flex flex-wrap items-center gap-x-5 gap-y-2 font-bold">
            <Link href={`/conditions-generales?lang=${locale}`} className="hover:text-terre hover:underline">{text.terms}</Link>
            <Link href={`/confidentialite?lang=${locale}`} className="hover:text-terre hover:underline">{text.privacy}</Link>
          </nav>
          <a href="mailto:bonjour@je-mange-africain.com" className="inline-flex w-fit max-w-full items-center gap-2 text-muted-foreground hover:text-terre">
            <Mail className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{text.contact}</span>
            <strong className="break-all text-charcoal">bonjour@je-mange-africain.com</strong>
          </a>
        </div>
      </footer>
    </main>
  );
}
