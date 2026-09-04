"use client";

import { type FormEvent, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Link2,
  LoaderCircle,
  LockKeyhole,
  MailCheck,
  ShieldCheck,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BrandLockup } from "@/components/shared/BrandLockup";
import { LanguageSwitch } from "@/components/shared/LanguageSwitch";
import { CustomerAuthVisualPanel } from "@/components/storefront/CustomerAuthVisualPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";

type ResetStatus = "idle" | "busy" | "success" | "error";

export default function PasswordResetPage() {
  const locale = useStore((state) => state.locale);
  const isFr = locale === "fr";
  const [accessToken, setAccessToken] = useState("");
  const [tokenChecked, setTokenChecked] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [status, setStatus] = useState<ResetStatus>("idle");
  const [message, setMessage] = useState("");
  const passwordsMatch = confirmation.length > 0 && password === confirmation;
  const passwordsReady = password.length >= 8 && confirmation.length >= 8 && passwordsMatch;
  const journeyStage = status === "success" ? 2 : accessToken ? 1 : 0;

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    setAccessToken(params.get("access_token") || "");
    setTokenChecked(true);
  }, []);

  const clearFeedback = () => {
    if (status !== "error") return;
    setStatus("idle");
    setMessage("");
  };

  const updatePassword = (value: string) => {
    setPassword(value);
    clearFeedback();
  };

  const updateConfirmation = (value: string) => {
    setConfirmation(value);
    clearFeedback();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!passwordsReady) {
      setStatus("error");
      setMessage(isFr ? "Saisissez deux mots de passe identiques d'au moins 8 caractères." : "Enter two matching passwords of at least 8 characters.");
      return;
    }

    setStatus("busy");
    setMessage("");
    try {
      const response = await fetch("/api/auth/customer/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, password }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus("error");
        setMessage(resolveResetError(payload.error, locale));
        return;
      }
      setStatus("success");
      setMessage(isFr ? "Votre mot de passe a été modifié. Votre compte est prêt." : "Your password has been updated. Your account is ready.");
    } catch {
      setStatus("error");
      setMessage(isFr ? "La modification est momentanément indisponible." : "Password update is temporarily unavailable.");
    }
  };

  return (
    <main id="main-content" tabIndex={-1} className="relative grid h-dvh min-h-0 overflow-hidden bg-white lg:grid-cols-[minmax(0,1.08fr)_minmax(32rem,0.92fr)]">
      <div className="african-kente-stripe fixed inset-x-0 top-0 z-30 h-[3px]" />
      <a href="/" aria-label={isFr ? "Retour à l'accueil" : "Back to home"} title={isFr ? "Retour à l'accueil" : "Back to home"} className="fixed left-4 top-4 z-30 grid h-11 w-11 place-items-center rounded-full border border-burgundy/10 bg-white text-charcoal shadow-[0_10px_28px_-22px_rgba(90,38,50,0.7)] transition hover:border-terre/30 hover:text-terre sm:left-6 sm:top-6">
        <ArrowLeft className="h-5 w-5" />
      </a>
      <div className="fixed right-4 top-4 z-30 sm:right-6 sm:top-6"><LanguageSwitch compact /></div>

      <CustomerAuthVisualPanel locale={locale} mode="reset" />

      <section className="min-h-0 overflow-y-auto bg-white" data-testid="reset-auth-form-scroll">
        <div className="mx-auto flex min-h-full w-full max-w-[38rem] items-start px-4 pb-10 pt-20 sm:items-center sm:px-10 sm:py-16 lg:px-8 xl:px-11">
          <div className="w-full" data-testid="reset-auth-workspace">
            <a href="/" className="mb-7 flex justify-center sm:justify-start lg:hidden" aria-label={isFr ? "Accueil Je mange Africain" : "Je mange Africain home"} data-testid="reset-auth-mobile-brand"><BrandLockup size="large" locale={locale} className="[&>span:first-child]:h-20 [&>span:first-child]:w-20" /></a>

            <div className="flex items-start gap-3.5">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md border border-terre/10 bg-[linear-gradient(145deg,rgba(185,71,43,0.12),rgba(242,169,0,0.06))] text-terre"><KeyRound className="h-5 w-5" /></span>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase text-terre">{isFr ? "Sécurité du compte" : "Account security"}</p>
                <h1 className="mt-1 font-display text-[1.75rem] font-semibold leading-tight text-charcoal sm:text-[2rem]">{isFr ? "Nouveau mot de passe" : "New password"}</h1>
                <p className="mt-2 max-w-lg text-xs leading-5 text-muted-foreground">{isFr ? "Finalisez votre nouvel accès personnel sans perdre vos commandes, favoris ni recettes." : "Finish setting up your new personal access without losing orders, saved items or recipes."}</p>
              </div>
            </div>

            <ResetJourney locale={locale} stage={journeyStage} tokenValid={Boolean(accessToken)} />

            {!tokenChecked ? (
              <div className="mt-7 flex items-center gap-3 border-y border-charcoal/8 py-5 text-xs font-bold text-muted-foreground" role="status"><span className="grid h-10 w-10 place-items-center rounded-md bg-terre/[0.07] text-terre"><LoaderCircle className="h-4 w-4 animate-spin" /></span>{isFr ? "Vérification du lien sécurisé" : "Checking the secure link"}</div>
            ) : !accessToken && status !== "success" ? (
              <InvalidResetLink locale={locale} />
            ) : status === "success" ? (
              <ResetComplete locale={locale} message={message} />
            ) : (
              <form onSubmit={submit} className="mt-6 space-y-5" aria-label={isFr ? "Formulaire de nouveau mot de passe" : "New password form"}>
                <fieldset className="min-w-0 border-t border-charcoal/8 pt-4">
                  <legend className="text-xs font-black text-charcoal">{isFr ? "Créez votre nouvel accès" : "Create your new access"}</legend>
                  <p className="mt-1 text-[10px] leading-4 text-muted-foreground">{isFr ? "Saisissez exactement le même mot de passe dans les deux champs." : "Enter exactly the same password in both fields."}</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <ResetPasswordInput id="new-password" label={isFr ? "Nouveau mot de passe" : "New password"} value={password} onChange={updatePassword} locale={locale} />
                    <ResetPasswordInput id="confirm-password" label={isFr ? "Confirmer le mot de passe" : "Confirm password"} value={confirmation} onChange={updateConfirmation} locale={locale} />
                  </div>
                  <PasswordStrength password={password} locale={locale} />
                  {confirmation ? <p aria-live="polite" className={`mt-2 flex min-h-6 items-center gap-1.5 text-[11px] font-semibold ${passwordsMatch ? "text-burgundy" : "text-destructive"}`}>{passwordsMatch ? <CheckCircle2 className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}{passwordsMatch ? (isFr ? "Les mots de passe correspondent." : "Passwords match.") : (isFr ? "Les mots de passe ne correspondent pas." : "Passwords do not match.")}</p> : null}
                </fieldset>

                {status === "error" ? <p role="alert" className="flex gap-2 rounded-md border border-destructive/25 bg-destructive/[0.05] p-3 text-xs leading-5 text-destructive"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />{message}</p> : null}
                <Button type="submit" disabled={status === "busy" || !passwordsReady} className={`min-h-12 w-full justify-between px-4 disabled:opacity-100 ${status === "busy" || !passwordsReady ? "bg-muted text-muted-foreground shadow-none hover:bg-muted" : "bg-terre text-white shadow-[0_16px_34px_-24px_rgba(185,71,43,0.9)] hover:bg-terre-dark"}`}>
                  <span className="inline-flex items-center gap-2">{status === "busy" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}{status === "busy" ? (isFr ? "Modification..." : "Updating...") : (isFr ? "Modifier le mot de passe" : "Update password")}</span><ArrowRight className="h-4 w-4" />
                </Button>
                <p className="flex items-start gap-2 border-t border-charcoal/8 pt-4 text-[10px] leading-4 text-muted-foreground"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-burgundy" />{isFr ? "Le nouveau mot de passe sera utilisé lors de votre prochaine connexion client." : "The new password will be used for your next customer sign-in."}</p>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function ResetJourney({ locale, stage, tokenValid }: { locale: "fr" | "en"; stage: number; tokenValid: boolean }) {
  const isFr = locale === "fr";
  const steps: Array<{ icon: LucideIcon; label: string; detail: string }> = isFr
    ? [
        { icon: Link2, label: "Lien sécurisé", detail: tokenValid ? "Lien reconnu" : "À vérifier" },
        { icon: KeyRound, label: "Mot de passe", detail: "Double saisie" },
        { icon: CheckCircle2, label: "Compte prêt", detail: "Connexion" },
      ]
    : [
        { icon: Link2, label: "Secure link", detail: tokenValid ? "Link recognised" : "To be checked" },
        { icon: KeyRound, label: "Password", detail: "Enter twice" },
        { icon: CheckCircle2, label: "Account ready", detail: "Sign in" },
      ];
  return (
    <ol className="mt-6 grid grid-cols-3 gap-1.5 border-y border-charcoal/8 py-3" aria-label={isFr ? "Étapes de modification du mot de passe" : "Password update steps"} data-testid="reset-journey">
      {steps.map((step, index) => {
        const completed = index < stage;
        const active = index === stage;
        const Icon = step.icon;
        return <li key={step.label} aria-current={active ? "step" : undefined} className={`min-w-0 border-l-2 px-2 py-1.5 first:border-l-0 sm:px-3 ${active ? "border-terre" : "border-charcoal/8"}`}><span className={`grid h-7 w-7 place-items-center rounded-md ${completed ? "bg-burgundy text-white" : active ? "bg-terre text-white" : "bg-muted text-muted-foreground"}`}>{completed ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}</span><span className="mt-2 block truncate text-[9px] font-black text-charcoal">{step.label}</span><span className="mt-0.5 hidden text-[8px] text-muted-foreground sm:block">{step.detail}</span></li>;
      })}
    </ol>
  );
}

function InvalidResetLink({ locale }: { locale: "fr" | "en" }) {
  const isFr = locale === "fr";
  return (
    <section className="mt-6" aria-labelledby="invalid-reset-title">
      <div className="flex items-start gap-3 border-y border-destructive/18 bg-destructive/[0.035] py-5"><span className="ml-1 grid h-10 w-10 shrink-0 place-items-center rounded-md bg-destructive/10 text-destructive"><X className="h-4 w-4" /></span><div className="min-w-0"><h2 id="invalid-reset-title" className="text-sm font-black text-charcoal">{isFr ? "Ce lien n'est plus utilisable" : "This link can no longer be used"}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{isFr ? "Il est incomplet ou a expiré. Lancez une nouvelle demande depuis l'espace de connexion." : "It is incomplete or has expired. Start a new request from the sign-in workspace."}</p></div></div>
      <Button asChild className="mt-5 min-h-12 w-full justify-between bg-terre px-4 text-white hover:bg-terre-dark"><a href="/?view=account"><span className="inline-flex items-center gap-2"><MailCheck className="h-4 w-4" />{isFr ? "Demander un nouveau lien" : "Request a new link"}</span><ArrowRight className="h-4 w-4" /></a></Button>
    </section>
  );
}

function ResetComplete({ locale, message }: { locale: "fr" | "en"; message: string }) {
  const isFr = locale === "fr";
  const confirmations = isFr ? ["Nouveau mot de passe enregistré", "Compte client prêt", "Connexion disponible"] : ["New password saved", "Customer account ready", "Sign-in available"];
  return (
    <section className="mt-6" aria-labelledby="reset-complete-title">
      <div className="flex items-start gap-3 rounded-md border border-burgundy/20 bg-burgundy/[0.045] p-4 text-burgundy" role="status"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-burgundy text-white"><CheckCircle2 className="h-5 w-5" /></span><div><h2 id="reset-complete-title" className="text-sm font-black">{isFr ? "Accès renouvelé" : "Access renewed"}</h2><p className="mt-1 text-xs leading-5">{message}</p></div></div>
      <ul className="mt-4 grid grid-cols-3 divide-x divide-charcoal/8 border-y border-charcoal/8 py-3" aria-label={isFr ? "Confirmation de sécurité" : "Security confirmation"}>{confirmations.map((confirmation, index) => <li key={confirmation} className="min-w-0 px-2 text-center"><span className="mx-auto grid h-6 w-6 place-items-center rounded-md bg-terre/[0.08] text-terre"><Check className="h-3.5 w-3.5" /></span><span className="mt-1.5 block text-[8px] font-black leading-3 text-charcoal sm:text-[9px]">{confirmation}</span><span className="mt-1 block text-[8px] font-black text-burgundy">0{index + 1}</span></li>)}</ul>
      <Button asChild className="mt-5 min-h-12 w-full justify-between bg-terre px-4 text-white hover:bg-terre-dark"><a href="/?view=account"><span className="inline-flex items-center gap-2"><LockKeyhole className="h-4 w-4" />{isFr ? "Se connecter" : "Sign in"}</span><ArrowRight className="h-4 w-4" /></a></Button>
    </section>
  );
}

function ResetPasswordInput({ id, label, value, onChange, locale }: { id: string; label: string; value: string; onChange: (value: string) => void; locale: "fr" | "en" }) {
  const [visible, setVisible] = useState(false);
  const actionLabel = visible ? (locale === "fr" ? "Masquer le mot de passe" : "Hide password") : (locale === "fr" ? "Afficher le mot de passe" : "Show password");
  return (
    <div className="min-w-0">
      <Label htmlFor={id} className="mb-1.5 block text-xs font-bold text-charcoal">{label}</Label>
      <div className="relative">
        <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-terre" />
        <Input id={id} type={visible ? "text" : "password"} autoComplete="new-password" minLength={8} value={value} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-md border-charcoal/10 bg-white pl-9 pr-11 focus:border-terre" required />
        <button type="button" onClick={() => setVisible((current) => !current)} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground transition hover:text-terre" aria-label={actionLabel} title={actionLabel}>{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
      </div>
    </div>
  );
}

function PasswordStrength({ password, locale }: { password: string; locale: "fr" | "en" }) {
  const isFr = locale === "fr";
  const score = [password.length >= 8, password.length >= 12, /[A-Za-z]/.test(password) && /\d/.test(password), /[^A-Za-z\d]/.test(password)].filter(Boolean).length;
  const level = score >= 4 ? (isFr ? "Très solide" : "Very strong") : score >= 3 ? (isFr ? "Solide" : "Strong") : score >= 2 ? (isFr ? "Correct" : "Fair") : (isFr ? "À renforcer" : "Needs strengthening");
  return <div className="mt-3" aria-live="polite"><div className="flex items-center justify-between text-[9px] font-bold text-muted-foreground"><span>{isFr ? "Force du mot de passe" : "Password strength"}</span><span className={score >= 3 ? "text-burgundy" : "text-terre"}>{password ? level : (isFr ? "8 caractères minimum" : "8 characters minimum")}</span></div><div className="mt-1.5 grid grid-cols-4 gap-1" aria-hidden="true">{Array.from({ length: 4 }).map((_, index) => <span key={index} className={`h-1 rounded-full ${index < score ? (score >= 3 ? "bg-burgundy" : "bg-terre") : "bg-muted"}`} />)}</div></div>;
}

function resolveResetError(error: unknown, locale: "fr" | "en") {
  const message = typeof error === "string" ? error.trim() : "";
  if (!message || /configur|supabase|service[ _-]?role|api[ _-]?key/i.test(message)) {
    return locale === "fr" ? "Le mot de passe n'a pas pu être modifié." : "The password could not be updated.";
  }
  return message;
}
