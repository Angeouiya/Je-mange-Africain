"use client";

import { FormEvent, useEffect, useState } from "react";
import { Eye, EyeOff, Globe2, LoaderCircle, LockKeyhole, ShieldCheck } from "lucide-react";
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
        // The login form is the safe fallback for an absent or expired session.
      } finally {
        if (active) setChecking(false);
      }
    };
    void restore();
    return () => { active = false; };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
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
        <main id="main-content" tabIndex={-1} className="grid min-h-screen place-items-center bg-white">
          <LoaderCircle className="h-7 w-7 animate-spin text-terre" aria-label={isFr ? "Vérification de la session" : "Checking session"} />
        </main>
      </>
    );
  }

  if (session) return <><title>{pageTitle}</title><AdminView adminEmail={session.email} adminRole={session.role} onLogout={logout} locale={locale} onLocaleChange={changeLocale} /></>;

  return (
    <>
      <title>{pageTitle}</title>
      <main id="main-content" tabIndex={-1} className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,1.08fr)_minmax(30rem,0.72fr)]">
      <div className="fixed right-4 top-4 z-20 inline-flex items-center gap-1 rounded-md border border-border bg-white/95 p-1 shadow-sm backdrop-blur sm:right-6 sm:top-6" role="group" aria-label={isFr ? "Langue de la console" : "Console language"}>
        <Globe2 className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        {(["fr", "en"] as const).map((language) => (
          <button key={language} type="button" onClick={() => changeLocale(language)} aria-pressed={locale === language} className={`grid h-8 min-w-9 place-items-center rounded px-2 text-[10px] font-black uppercase transition ${locale === language ? "bg-charcoal text-white" : "text-muted-foreground hover:bg-muted hover:text-charcoal"}`}>
            {language}
          </button>
        ))}
      </div>
      <section className="jma-page-grid relative hidden overflow-hidden bg-charcoal p-14 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="african-kente-stripe absolute inset-x-0 top-0 h-[3px]" />
        <BrandLockup context="admin" size="large" inverse locale={locale} />
        <div className="max-w-xl">
          <p className="text-[10px] font-extrabold uppercase text-gold">{isFr ? "Console d'exploitation" : "Operations console"}</p>
          <h1 className="mt-5 max-w-2xl font-display text-5xl font-semibold leading-[1.08]">{isFr ? "Piloter Je mange Africain avec précision." : "Run Je mange Africain with precision."}</h1>
          <p className="mt-5 max-w-lg text-sm leading-7 text-white/62">{isFr ? "Catalogue, recettes, stocks, commandes et conformité réunis dans un espace strictement réservé aux équipes autorisées." : "Catalogue, recipes, stock, orders and compliance brought together in a workspace reserved for authorised teams."}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/52"><ShieldCheck className="h-4 w-4 text-gold" /> {isFr ? "Accès contrôlé par rôles Supabase" : "Access controlled by Supabase roles"}</div>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-12">
        <div className="w-full max-w-md">
          <BrandLockup context="admin" size="large" locale={locale} className="mb-9 lg:hidden" />
          <div className="mb-8">
            <span className="grid h-11 w-11 place-items-center rounded-md border border-terre/10 bg-terre/8 text-terre"><LockKeyhole className="h-5 w-5" /></span>
            <h2 className="mt-5 font-display text-3xl font-semibold text-charcoal">{isFr ? "Connexion professionnelle" : "Professional sign in"}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{isFr ? "Utilisez le compte professionnel attribué par la direction. Les comptes clients ne sont pas acceptés ici." : "Use the professional account assigned by management. Customer accounts are not accepted here."}</p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="admin-email">{isFr ? "Adresse e-mail professionnelle" : "Professional email address"}</Label>
              <Input id="admin-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="prenom@je-mange-africain.com" className="h-11 border-charcoal/14 bg-white" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">{isFr ? "Mot de passe" : "Password"}</Label>
              <div className="relative">
                <Input id="admin-password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} className="h-11 border-charcoal/14 bg-white pr-11" />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground hover:text-charcoal" aria-label={showPassword ? (isFr ? "Masquer le mot de passe" : "Hide password") : (isFr ? "Afficher le mot de passe" : "Show password")}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error ? <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs leading-5 text-destructive">{error}</p> : null}
            <Button type="submit" disabled={submitting} className="h-11 w-full bg-terre text-white hover:bg-terre-dark">
              {submitting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <LockKeyhole className="mr-2 h-4 w-4" />}
              {submitting ? (isFr ? "Vérification..." : "Checking...") : (isFr ? "Accéder à la console" : "Open the console")}
            </Button>
          </form>
          <p className="mt-6 text-center text-[11px] leading-5 text-muted-foreground">{isFr ? "Accès journalisé. Toute tentative non autorisée peut faire l'objet d'un contrôle de sécurité." : "Access is logged. Any unauthorised attempt may be subject to a security review."}</p>
        </div>
      </section>
      </main>
    </>
  );
}
