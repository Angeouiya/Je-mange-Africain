"use client";

import { type FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { ArrowLeft } from "reicon/icons/ArrowLeft";
import { ArrowRight } from "reicon/icons/ArrowRight";
import { AtSign } from "reicon/icons/AtSign";
import { CheckCircle } from "reicon/icons/CheckCircle";
import { Envelope } from "reicon/icons/Envelope";
import { Eye } from "reicon/icons/Eye";
import { EyeOff } from "reicon/icons/EyeOff";
import { Globe2 } from "reicon/icons/Globe2";
import { Key } from "reicon/icons/Key";
import { Loader } from "reicon/icons/Loader";
import { LockKeyhole } from "reicon/icons/LockKeyhole";
import { ShieldCheck } from "reicon/icons/ShieldCheck";
import { BrandLockup } from "@/components/shared/BrandLockup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReiconGlyph } from "@/components/ui/reicon-glyph";
import type { Locale } from "@/lib/i18n";

type Status = "idle" | "busy" | "sent" | "success" | "error";

export default function AdminPasswordResetPage() {
  const [locale, setLocale] = useState<Locale>("fr");
  const [accessToken, setAccessToken] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [tokenChecked, setTokenChecked] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const isFr = locale === "fr";
  const passwordsReady = password.length >= 8 && confirmation.length >= 8 && password === confirmation;

  useEffect(() => {
    const savedLocale = window.localStorage.getItem("jma-admin-locale");
    setLocale(savedLocale === "en" ? "en" : "fr");
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const token = params.get("access_token") || "";
    setAccessToken(token);
    setRecoveryEmail(emailFromAccessToken(token));
    setTokenChecked(true);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = isFr ? "Modifier le mot de passe | Je mange Africain" : "Update password | Je mange Africain";
  }, [isFr, locale]);

  const changeLocale = (next: Locale) => {
    setLocale(next);
    window.localStorage.setItem("jma-admin-locale", next);
  };

  const requestLink = async (event: FormEvent) => {
    event.preventDefault();
    setStatus("busy");
    setMessage("");
    try {
      const response = await fetch("/api/admin/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || (isFr ? "Demande impossible." : "Request failed."));
      setStatus("sent");
      setMessage(isFr ? "Si ce compte professionnel existe, un lien sécurisé vient d'être envoyé." : "If this professional account exists, a secure link has just been sent.");
    } catch (cause) {
      setStatus("error");
      setMessage(cause instanceof Error ? cause.message : (isFr ? "Demande impossible." : "Request failed."));
    }
  };

  const updatePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (!passwordsReady) {
      setStatus("error");
      setMessage(isFr ? "Saisissez deux mots de passe identiques d'au moins 8 caractères." : "Enter two matching passwords of at least 8 characters.");
      return;
    }
    setStatus("busy");
    setMessage("");
    try {
      const response = await fetch("/api/admin/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, password }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || (isFr ? "Modification impossible." : "Update failed."));
      setStatus("success");
      setMessage(isFr ? "Votre mot de passe professionnel a été modifié." : "Your professional password has been updated.");
      window.history.replaceState(null, "", "/admin/reset");
    } catch (cause) {
      setStatus("error");
      setMessage(cause instanceof Error ? cause.message : (isFr ? "Modification impossible." : "Update failed."));
    }
  };

  return (
    <main id="main-content" tabIndex={-1} className="grid min-h-dvh bg-white lg:grid-cols-[minmax(0,1.08fr)_minmax(31rem,0.72fr)]">
      <div className="african-kente-stripe fixed inset-x-0 top-0 z-30 h-[3px]" />
      <a href="/admin" aria-label={isFr ? "Retour à la connexion" : "Back to sign in"} title={isFr ? "Retour" : "Back"} className="fixed left-4 top-4 z-30 grid h-11 w-11 place-items-center rounded-full border border-burgundy/10 bg-white text-charcoal shadow-[0_10px_28px_-22px_rgba(90,38,50,0.7)] transition hover:text-terre sm:left-6 sm:top-6">
        <ReiconGlyph icon={ArrowLeft} className="h-5 w-5" />
      </a>
      <div className="fixed right-4 top-4 z-30 inline-flex items-center gap-1 rounded-md border border-burgundy/10 bg-white/95 p-1 shadow-[0_10px_26px_-22px_rgba(90,38,50,0.7)] sm:right-6 sm:top-6" role="group" aria-label={isFr ? "Langue" : "Language"}>
        <ReiconGlyph icon={Globe2} weight="Filled" className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" />
        {(["fr", "en"] as const).map((language) => <button key={language} type="button" onClick={() => changeLocale(language)} aria-pressed={locale === language} className={`grid h-8 min-w-9 place-items-center rounded px-2 text-[10px] font-black uppercase ${locale === language ? "bg-burgundy text-white" : "text-muted-foreground hover:bg-burgundy/5"}`}>{language}</button>)}
      </div>

      <section className="relative hidden min-h-dvh overflow-hidden text-white lg:flex lg:flex-col lg:justify-between lg:p-14 xl:p-16" aria-label={isFr ? "Sécurité de la console professionnelle" : "Professional console security"}>
        <Image src="/recipe-library-hero.webp" alt="" fill sizes="62vw" loading="eager" fetchPriority="high" className="object-cover object-[58%_center]" />
        <div className="absolute inset-0 bg-burgundy/70" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(90,38,50,0.96),rgba(90,38,50,0.72),rgba(185,71,43,0.24))]" />
        <BrandLockup context="admin" size="large" inverse locale={locale} className="relative z-10" />
        <div className="relative z-10 max-w-xl">
          <p className="inline-flex items-center gap-2 text-[10px] font-black uppercase text-gold"><ReiconGlyph icon={ShieldCheck} weight="Filled" className="h-4 w-4" />{isFr ? "Sécurité professionnelle" : "Professional security"}</p>
          <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.06] xl:text-6xl">{isFr ? "Renouvelez votre accès en toute confiance." : "Renew your access with confidence."}</h1>
          <p className="mt-5 max-w-lg text-sm leading-7 text-cream/82">{isFr ? "Le lien reçu par e-mail est personnel, temporaire et réservé aux comptes habilités." : "The email link is personal, temporary and restricted to authorized accounts."}</p>
        </div>
        <p className="relative z-10 border-t border-white/20 pt-5 text-[10px] font-bold text-cream/72">Promise Corporation · Je mange Africain</p>
      </section>

      <section className="flex min-h-dvh items-start justify-center px-4 pb-10 pt-20 sm:items-center sm:px-10 sm:py-16 lg:px-10 xl:px-14">
        <div className="w-full max-w-md">
          <BrandLockup context="admin" size="large" locale={locale} className="mb-8 [&>span:first-child]:h-20 [&>span:first-child]:w-20 lg:hidden" />
          <div className="flex items-start gap-3.5">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md border border-terre/12 bg-terre/[0.07] text-terre"><ReiconGlyph icon={Key} weight="Filled" className="h-5 w-5" /></span>
            <div className="min-w-0"><p className="text-[9px] font-black uppercase text-terre">{isFr ? "Accès équipe" : "Team access"}</p><h2 className="mt-1 font-display text-[1.75rem] font-semibold leading-tight text-charcoal sm:text-[2rem]">{accessToken ? (isFr ? "Nouveau mot de passe" : "New password") : (isFr ? "Récupérer l'accès" : "Recover access")}</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">{accessToken ? (isFr ? "Confirmez votre nouveau mot de passe professionnel." : "Confirm your new professional password.") : (isFr ? "Recevez un lien sécurisé sur l'adresse attribuée par la direction." : "Receive a secure link at the address assigned by management.")}</p></div>
          </div>

          {!tokenChecked ? <p className="mt-7 flex items-center gap-2 border-y border-charcoal/8 py-5 text-xs font-bold text-muted-foreground"><ReiconGlyph icon={Loader} className="h-4 w-4 animate-spin text-terre" />{isFr ? "Vérification du lien..." : "Checking the link..."}</p> : status === "success" ? (
            <section className="mt-7"><div role="status" className="flex items-start gap-3 rounded-md border border-burgundy/20 bg-burgundy/[0.045] p-4 text-burgundy"><ReiconGlyph icon={CheckCircle} weight="Filled" className="mt-0.5 h-5 w-5 shrink-0" /><div><h3 className="text-sm font-black">{isFr ? "Accès renouvelé" : "Access renewed"}</h3><p className="mt-1 text-xs leading-5">{message}</p></div></div><Button asChild className="mt-5 min-h-12 w-full justify-between bg-terre px-4 text-white hover:bg-terre-dark"><a href="/admin"><span className="inline-flex items-center gap-2"><ReiconGlyph icon={LockKeyhole} weight="Filled" className="h-4 w-4" />{isFr ? "Se connecter" : "Sign in"}</span><ReiconGlyph icon={ArrowRight} className="h-4 w-4" /></a></Button></section>
          ) : accessToken ? (
            <form onSubmit={updatePassword} className="mt-7 space-y-4" aria-label={isFr ? "Modification du mot de passe professionnel" : "Professional password update"}>
              <input type="email" name="username" autoComplete="username" value={recoveryEmail} readOnly tabIndex={-1} aria-hidden className="sr-only" />
              <PasswordField id="admin-new-password" label={isFr ? "Nouveau mot de passe" : "New password"} value={password} visible={showPassword} onToggle={() => setShowPassword((value) => !value)} onChange={setPassword} locale={locale} />
              <PasswordField id="admin-confirm-password" label={isFr ? "Confirmer le mot de passe" : "Confirm password"} value={confirmation} visible={showConfirmation} onToggle={() => setShowConfirmation((value) => !value)} onChange={setConfirmation} locale={locale} />
              {confirmation ? <p className={`text-[10px] font-bold ${passwordsReady ? "text-burgundy" : "text-terre"}`}>{passwordsReady ? (isFr ? "Les mots de passe correspondent." : "Passwords match.") : (isFr ? "Les mots de passe doivent être identiques." : "Passwords must match.")}</p> : null}
              <Feedback status={status} message={message} />
              <SubmitButton busy={status === "busy"} disabled={!passwordsReady} label={isFr ? "Modifier le mot de passe" : "Update password"} busyLabel={isFr ? "Modification..." : "Updating..."} />
            </form>
          ) : (
            <form onSubmit={requestLink} className="mt-7 space-y-4" aria-label={isFr ? "Récupération de l'accès professionnel" : "Professional access recovery"}>
              <div><Label htmlFor="admin-recovery-email" className="mb-1.5 block text-xs font-bold text-charcoal">{isFr ? "Adresse e-mail professionnelle" : "Professional email address"}</Label><div className="relative"><ReiconGlyph icon={AtSign} weight="Filled" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-terre" /><Input id="admin-recovery-email" type="email" autoFocus autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); setStatus("idle"); }} required className="h-11 rounded-md border-charcoal/12 bg-white pl-9" /></div></div>
              <Feedback status={status} message={message} />
              {status !== "sent" ? <SubmitButton busy={status === "busy"} disabled={!/^\S+@\S+\.\S+$/.test(email.trim())} label={isFr ? "Recevoir le lien sécurisé" : "Receive secure link"} busyLabel={isFr ? "Envoi..." : "Sending..."} /> : null}
            </form>
          )}

          <div className="mt-5 flex items-center justify-between gap-3 border-t border-charcoal/8 pt-4 text-[10px] font-bold"><a href="/admin" className="inline-flex min-h-10 items-center gap-1.5 text-charcoal hover:text-terre"><ReiconGlyph icon={ArrowLeft} className="h-3.5 w-3.5" />{isFr ? "Connexion professionnelle" : "Professional sign in"}</a><a href="mailto:direction@je-mange-africain.com" className="inline-flex min-h-10 items-center gap-1.5 text-terre hover:underline"><ReiconGlyph icon={Envelope} weight="Filled" className="h-3.5 w-3.5" />{isFr ? "Direction" : "Management"}</a></div>
        </div>
      </section>
    </main>
  );
}

function PasswordField({ id, label, value, visible, onToggle, onChange, locale }: { id: string; label: string; value: string; visible: boolean; onToggle: () => void; onChange: (value: string) => void; locale: Locale }) {
  const action = visible ? (locale === "fr" ? "Masquer" : "Hide") : (locale === "fr" ? "Afficher" : "Show");
  return <div><Label htmlFor={id} className="mb-1.5 block text-xs font-bold text-charcoal">{label}</Label><div className="relative"><ReiconGlyph icon={LockKeyhole} weight="Filled" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-terre" /><Input id={id} type={visible ? "text" : "password"} autoComplete="new-password" minLength={8} value={value} onChange={(event) => onChange(event.target.value)} required className="h-11 rounded-md border-charcoal/12 bg-white pl-9 pr-11" /><button type="button" onClick={onToggle} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground hover:text-terre" aria-label={action} title={action}><ReiconGlyph icon={visible ? EyeOff : Eye} className="h-4 w-4" /></button></div></div>;
}

function Feedback({ status, message }: { status: Status; message: string }) {
  if (!message) return null;
  const success = status === "sent";
  return <p role={success ? "status" : "alert"} className={`flex gap-2 rounded-md border px-3 py-2.5 text-xs leading-5 ${success ? "border-burgundy/20 bg-burgundy/[0.045] text-burgundy" : "border-destructive/20 bg-destructive/[0.045] text-destructive"}`}><ReiconGlyph icon={success ? CheckCircle : ShieldCheck} weight="Filled" className="mt-0.5 h-4 w-4 shrink-0" />{message}</p>;
}

function SubmitButton({ busy, disabled, label, busyLabel }: { busy: boolean; disabled: boolean; label: string; busyLabel: string }) {
  return <Button type="submit" disabled={busy || disabled} className={`min-h-12 w-full justify-between px-4 disabled:opacity-100 ${busy || disabled ? "bg-muted text-muted-foreground shadow-none hover:bg-muted" : "bg-terre text-white hover:bg-terre-dark"}`}><span className="inline-flex items-center gap-2">{busy ? <ReiconGlyph icon={Loader} className="h-4 w-4 animate-spin" /> : <ReiconGlyph icon={Key} weight="Filled" className="h-4 w-4" />}{busy ? busyLabel : label}</span><ReiconGlyph icon={ArrowRight} className="h-4 w-4" /></Button>;
}

function emailFromAccessToken(token: string) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return "";
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const email = JSON.parse(window.atob(normalized))?.email;
    return typeof email === "string" ? email : "";
  } catch {
    return "";
  }
}
