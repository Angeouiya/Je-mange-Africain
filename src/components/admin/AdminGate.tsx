"use client";

import { type FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  AtSign,
  BadgeCheck,
  Eye,
  EyeOff,
  Fingerprint,
  Globe2,
  History,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRoundCog,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AdminView } from "@/components/admin/AdminView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLockup } from "@/components/shared/BrandLockup";
import type { Locale } from "@/lib/i18n";

type AdminSession = { email: string; role: string };

export function AdminGate() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [locale, setLocale] = useState<Locale>("fr");
  const isFr = locale === "fr";
  const pageTitle = isFr ? "Console professionnelle | Je mange Africain" : "Professional console | Je mange Africain";
  const credentialsReady = /^\S+@\S+\.\S+$/.test(email.trim()) && password.length >= 8;

  useEffect(() => {
    const savedLocale = window.localStorage.getItem("jma-admin-locale");
    const preferredLocale: Locale = savedLocale === "en" || savedLocale === "fr" ? savedLocale : "fr";
    setLocale(preferredLocale);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    window.dispatchEvent(new CustomEvent<Locale>("jma-document-locale", { detail: locale }));
    const syncTitle = () => {
      if (document.title !== pageTitle) document.title = pageTitle;
    };
    syncTitle();
    const observer = new MutationObserver(syncTitle);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [locale, pageTitle]);

  const changeLocale = (nextLocale: Locale) => {
    setLocale(nextLocale);
    window.localStorage.setItem("jma-admin-locale", nextLocale);
  };

  useEffect(() => {
    let active = true;
    const restore = async () => {
      try {
        const response = await fetch("/api/admin/session", { cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json();
        if (active && payload.user) setSession({ email: payload.user.email, role: payload.user.role });
      } catch {
        // The professional sign-in remains available when no session can be restored.
      } finally {
        if (active) setChecking(false);
      }
    };
    void restore();
    return () => { active = false; };
  }, []);

  const clearError = () => {
    if (error) setError("");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!credentialsReady) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || (isFr ? "Connexion impossible." : "Unable to sign in."));
      setSession({ email: payload.user.email, role: payload.user.role });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (isFr ? "Connexion impossible." : "Unable to sign in."));
    } finally {
      setSubmitting(false);
    }
  };

  const logout = async () => {
    await fetch("/api/admin/session", { method: "DELETE" }).catch(() => undefined);
    setSession(null);
  };

  if (checking) {
    return (
      <>
        <title>{pageTitle}</title>
        <main id="main-content" tabIndex={-1} className="grid min-h-dvh place-items-center bg-white px-6">
          <div className="text-center" role="status" aria-live="polite">
            <BrandLockup context="admin" size="large" locale={locale} className="justify-center" />
            <span className="mx-auto mt-8 grid h-11 w-11 place-items-center rounded-md border border-terre/15 bg-terre/[0.06] text-terre"><LoaderCircle className="h-5 w-5 animate-spin" /></span>
            <p className="mt-3 text-xs font-bold text-charcoal">{isFr ? "Vérification de la session professionnelle" : "Checking the professional session"}</p>
          </div>
        </main>
      </>
    );
  }

  if (session) return <><title>{pageTitle}</title><AdminView adminEmail={session.email} adminRole={session.role} onLogout={logout} locale={locale} onLocaleChange={changeLocale} /></>;

  const accessSignals = isFr
    ? [
        { icon: UserRoundCog, label: "Habilitations", detail: "Rôles appliqués" },
        { icon: History, label: "Traçabilité", detail: "Actions journalisées" },
        { icon: ShieldCheck, label: "Session", detail: "Accès protégé" },
      ]
    : [
        { icon: UserRoundCog, label: "Permissions", detail: "Roles enforced" },
        { icon: History, label: "Traceability", detail: "Actions logged" },
        { icon: ShieldCheck, label: "Session", detail: "Protected access" },
      ];

  return (
    <>
      <title>{pageTitle}</title>
      <main id="main-content" tabIndex={-1} className="grid min-h-dvh bg-white lg:grid-cols-[minmax(0,1.08fr)_minmax(31rem,0.72fr)]">
        <div className="african-kente-stripe fixed inset-x-0 top-0 z-30 h-[3px]" />
        <div className="fixed right-4 top-4 z-30 inline-flex items-center gap-1 rounded-md border border-burgundy/10 bg-white/95 p-1 shadow-[0_10px_26px_-22px_rgba(90,38,50,0.7)] backdrop-blur sm:right-6 sm:top-6" role="group" aria-label={isFr ? "Langue de la console" : "Console language"}>
          <Globe2 className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          {(["fr", "en"] as const).map((language) => (
            <button key={language} type="button" onClick={() => changeLocale(language)} aria-pressed={locale === language} className={`grid h-8 min-w-9 place-items-center rounded px-2 text-[10px] font-black uppercase transition ${locale === language ? "bg-burgundy text-white" : "text-muted-foreground hover:bg-burgundy/5 hover:text-burgundy"}`}>
              {language}
            </button>
          ))}
        </div>

        <section data-testid="admin-auth-visual" className="relative hidden min-h-dvh overflow-hidden text-white lg:flex lg:flex-col lg:justify-between lg:p-14 xl:p-16" aria-label={isFr ? "Univers professionnel Je mange Africain" : "Je mange Africain professional workspace"}>
          <Image src="/recipe-library-hero.webp" alt="" fill priority sizes="62vw" className="object-cover object-[58%_center]" />
          <div data-testid="admin-auth-overlay" className="absolute inset-0 bg-burgundy/55" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(90,38,50,0.96),rgba(90,38,50,0.74),rgba(185,71,43,0.3))]" />
          <BrandLockup context="admin" size="large" inverse locale={locale} className="relative z-10" />

          <div className="relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase text-gold"><Fingerprint className="h-4 w-4" />{isFr ? "Console de pilotage" : "Operations control"}</div>
            <h1 className="mt-5 max-w-2xl font-display text-5xl font-semibold leading-[1.06] xl:text-6xl">{isFr ? "Chaque décision, au bon niveau d'accès." : "Every decision, at the right access level."}</h1>
            <p className="mt-5 max-w-lg text-sm leading-7 text-cream/82">{isFr ? "Catalogue, recettes, stocks, commandes et conformité réunis dans un espace réservé aux équipes autorisées." : "Catalogue, recipes, stock, orders and compliance brought together for authorised teams."}</p>
          </div>

          <div className="relative z-10 grid grid-cols-3 divide-x divide-white/20 border-t border-white/22 pt-5" data-testid="admin-auth-signals">
            {accessSignals.map((signal) => <ProfessionalSignal key={signal.label} {...signal} />)}
          </div>
        </section>

        <section className="flex min-h-dvh items-start justify-center px-4 pb-10 pt-20 sm:items-center sm:px-10 sm:py-16 lg:px-10 xl:px-14" data-testid="admin-auth-workspace">
          <div className="w-full max-w-md">
            <BrandLockup context="admin" size="large" locale={locale} className="mb-8 [&>span:first-child]:h-20 [&>span:first-child]:w-20 lg:hidden" />

            <div className="flex items-start gap-3.5">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md border border-terre/12 bg-[linear-gradient(145deg,rgba(185,71,43,0.12),rgba(242,169,0,0.06))] text-terre"><LockKeyhole className="h-5 w-5" /></span>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase text-terre">{isFr ? "Accès équipe" : "Team access"}</p>
                <h2 className="mt-1 font-display text-[1.75rem] font-semibold leading-tight text-charcoal sm:text-[2rem]">{isFr ? "Connexion professionnelle" : "Professional sign in"}</h2>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{isFr ? "Utilisez l'identité attribuée par la direction. Les comptes clients restent séparés de cet espace." : "Use the identity assigned by management. Customer accounts remain separate from this workspace."}</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 divide-x divide-charcoal/8 border-y border-charcoal/8 py-3 lg:hidden" aria-label={isFr ? "Garanties de l'accès professionnel" : "Professional access safeguards"}>
              {accessSignals.map((signal) => <ProfessionalSignal key={signal.label} {...signal} compact />)}
            </div>

            <form onSubmit={submit} className="mt-6 space-y-4" aria-label={isFr ? "Formulaire de connexion professionnelle" : "Professional sign-in form"}>
              <div className="min-w-0">
                <Label htmlFor="admin-email" className="mb-1.5 block text-xs font-bold text-charcoal">{isFr ? "Adresse e-mail professionnelle" : "Professional email address"}</Label>
                <div className="relative"><AtSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-terre" /><Input id="admin-email" type="email" autoFocus autoComplete="username" value={email} onChange={(event) => { setEmail(event.target.value); clearError(); }} required placeholder="prenom@je-mange-africain.com" className="h-11 rounded-md border-charcoal/12 bg-white pl-9 focus:border-terre" /></div>
              </div>
              <div className="min-w-0">
                <div className="mb-1.5 flex items-center justify-between gap-3"><Label htmlFor="admin-password" className="text-xs font-bold text-charcoal">{isFr ? "Mot de passe" : "Password"}</Label><span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground"><BadgeCheck className="h-3.5 w-3.5 text-burgundy" />{isFr ? "Identité vérifiée à l'entrée" : "Identity checked on entry"}</span></div>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-terre" />
                  <Input id="admin-password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => { setPassword(event.target.value); clearError(); }} required minLength={8} className="h-11 rounded-md border-charcoal/12 bg-white pl-9 pr-11 focus:border-terre" />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground transition hover:text-terre" aria-label={showPassword ? (isFr ? "Masquer le mot de passe" : "Hide password") : (isFr ? "Afficher le mot de passe" : "Show password")} title={showPassword ? (isFr ? "Masquer" : "Hide") : (isFr ? "Afficher" : "Show")}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error ? <p role="alert" className="flex gap-2 rounded-md border border-destructive/20 bg-destructive/[0.045] px-3 py-2.5 text-xs leading-5 text-destructive"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />{error}</p> : null}
              <Button type="submit" disabled={submitting || !credentialsReady} className={`min-h-12 w-full justify-between px-4 disabled:opacity-100 ${submitting || !credentialsReady ? "bg-muted text-muted-foreground shadow-none hover:bg-muted" : "bg-terre text-white shadow-[0_16px_34px_-24px_rgba(185,71,43,0.9)] hover:bg-terre-dark"}`}>
                <span className="inline-flex items-center gap-2">{submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}{submitting ? (isFr ? "Vérification..." : "Checking...") : (isFr ? "Accéder à la console" : "Open the console")}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-charcoal/8 pt-4 text-[10px] font-bold">
              <a href="/" className="inline-flex min-h-10 items-center gap-1.5 text-charcoal transition hover:text-terre"><ArrowLeft className="h-3.5 w-3.5" />{isFr ? "Revenir à la boutique" : "Return to the store"}</a>
              <a href="mailto:direction@je-mange-africain.com" className="inline-flex min-h-10 items-center gap-1.5 text-terre hover:underline"><Mail className="h-3.5 w-3.5" />{isFr ? "Contacter la direction" : "Contact management"}</a>
            </div>
            <p className="mt-3 text-center text-[9px] leading-4 text-muted-foreground">{isFr ? "Chaque accès et chaque action sensible sont consignés dans le journal de gouvernance." : "Every access and sensitive action is recorded in the governance log."}</p>
          </div>
        </section>
      </main>
    </>
  );
}

function ProfessionalSignal({ icon: Icon, label, detail, compact = false }: { icon: LucideIcon; label: string; detail: string; compact?: boolean }) {
  return (
    <div className={`min-w-0 ${compact ? "px-2 text-center" : "px-4 first:pl-0 last:pr-0"}`}>
      <Icon className={`${compact ? "mx-auto h-4 w-4 text-terre" : "h-4 w-4 text-gold"}`} />
      <p className={`${compact ? "mt-1 text-[9px] text-charcoal" : "mt-2 text-[10px] text-white"} truncate font-black`}>{label}</p>
      <p className={`${compact ? "hidden" : "mt-0.5 text-[9px] text-cream/64"}`}>{detail}</p>
    </div>
  );
}
