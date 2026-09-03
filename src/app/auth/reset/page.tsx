"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, LoaderCircle, X } from "lucide-react";
import { BrandLockup } from "@/components/shared/BrandLockup";
import { LanguageSwitch } from "@/components/shared/LanguageSwitch";
import { CustomerAuthVisualPanel } from "@/components/storefront/CustomerAuthVisualPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";

export default function PasswordResetPage() {
  const locale = useStore((state) => state.locale);
  const isFr = locale === "fr";
  const [accessToken, setAccessToken] = useState("");
  const [tokenChecked, setTokenChecked] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const passwordsMatch = confirmation.length > 0 && password === confirmation;
  const passwordsReady = password.length >= 8 && confirmation.length >= 8 && passwordsMatch;

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    setAccessToken(params.get("access_token") || "");
    setTokenChecked(true);
  }, []);

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
    <main id="main-content" tabIndex={-1} className="relative grid h-dvh min-h-0 overflow-hidden bg-white lg:grid-cols-[minmax(0,1.12fr)_minmax(31rem,0.88fr)]">
      <div className="african-kente-stripe fixed inset-x-0 top-0 z-30 h-[3px]" />
      <a href="/?view=account" aria-label={isFr ? "Retour à la connexion" : "Back to sign in"} title={isFr ? "Retour à la connexion" : "Back to sign in"} className="fixed left-4 top-4 z-30 grid h-11 w-11 place-items-center rounded-full border border-border bg-white text-charcoal shadow-sm transition hover:border-terre hover:text-terre sm:left-6 sm:top-6">
        <ArrowLeft className="h-5 w-5" />
      </a>
      <div className="fixed right-4 top-4 z-30 sm:right-6 sm:top-6"><LanguageSwitch compact /></div>

      <CustomerAuthVisualPanel locale={locale} mode="reset" />

      <section className="min-h-0 overflow-y-auto bg-white">
        <div className="mx-auto flex min-h-full w-full max-w-[34rem] items-start px-4 pb-10 pt-20 sm:items-center sm:px-10 sm:py-16 lg:px-8 xl:px-10">
          <div className="w-full bg-white p-1 sm:p-2">
            <a href="/" className="mb-8 flex justify-center sm:justify-start lg:hidden" aria-label={isFr ? "Retour à l'accueil" : "Back to home"}><BrandLockup size="large" locale={locale} /></a>

            <div className="flex items-start gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-terre/10 text-terre"><KeyRound className="h-6 w-6" /></span>
              <div>
                <p className="mb-1 text-[9px] font-black uppercase text-terre">{isFr ? "Sécurité du compte" : "Account security"}</p>
                <h1 className="font-display text-[1.7rem] font-semibold leading-tight text-charcoal">{isFr ? "Nouveau mot de passe" : "New password"}</h1>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{isFr ? "Choisissez un accès personnel d'au moins 8 caractères." : "Choose a personal password with at least 8 characters."}</p>
              </div>
            </div>

            {!tokenChecked ? (
              <div className="mt-8 flex items-center gap-3 text-sm text-muted-foreground" role="status"><LoaderCircle className="h-5 w-5 animate-spin text-terre" /> {isFr ? "Vérification du lien…" : "Checking your link…"}</div>
            ) : !accessToken && status !== "success" ? (
              <div className="mt-7 space-y-4">
                <div className="flex gap-3 rounded-lg border border-destructive/25 bg-destructive/[0.06] p-4 text-sm leading-6 text-destructive" role="alert"><X className="mt-0.5 h-5 w-5 shrink-0" /><p>{isFr ? "Ce lien est incomplet ou a expiré. Demandez un nouvel e-mail depuis l'espace de connexion." : "This link is incomplete or has expired. Request a new email from the sign-in screen."}</p></div>
                <Button asChild variant="outline" className="h-11 w-full"><a href="/?view=account"><ArrowLeft className="mr-2 h-4 w-4" />{isFr ? "Revenir à la connexion" : "Return to sign in"}</a></Button>
              </div>
            ) : status === "success" ? (
              <div className="mt-7 space-y-4">
                <div className="flex gap-3 rounded-lg border border-burgundy/25 bg-burgundy/5 p-4 text-sm leading-6 text-burgundy" role="status"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /><p>{message}</p></div>
                <Button asChild className="h-11 w-full bg-terre text-cream hover:bg-terre-dark"><a href="/?view=account">{isFr ? "Se connecter" : "Sign in"}</a></Button>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-7 space-y-4">
                <ResetPasswordInput id="new-password" label={isFr ? "Nouveau mot de passe" : "New password"} value={password} onChange={setPassword} locale={locale} />
                <ResetPasswordInput id="confirm-password" label={isFr ? "Confirmer le mot de passe" : "Confirm password"} value={confirmation} onChange={setConfirmation} locale={locale} />
                {confirmation ? <p aria-live="polite" className={`flex items-center gap-1.5 text-[11px] font-semibold ${passwordsMatch ? "text-burgundy" : "text-destructive"}`}>{passwordsMatch ? <CheckCircle2 className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}{passwordsMatch ? (isFr ? "Les mots de passe correspondent." : "Passwords match.") : (isFr ? "Les mots de passe ne correspondent pas." : "Passwords do not match.")}</p> : null}
                {status === "error" ? <p role="alert" className="rounded-md border border-destructive/25 bg-destructive/[0.06] p-3 text-sm leading-6 text-destructive">{message}</p> : null}
                <Button type="submit" disabled={status === "busy" || !passwordsReady} className="h-11 w-full bg-terre text-cream hover:bg-terre-dark">{status === "busy" ? <><LoaderCircle className="mr-2 h-4 w-4 animate-spin" />{isFr ? "Modification…" : "Updating…"}</> : (isFr ? "Modifier le mot de passe" : "Update password")}</Button>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function ResetPasswordInput({ id, label, value, onChange, locale }: { id: string; label: string; value: string; onChange: (value: string) => void; locale: "fr" | "en" }) {
  const [visible, setVisible] = useState(false);
  const actionLabel = visible
    ? (locale === "fr" ? "Masquer le mot de passe" : "Hide password")
    : (locale === "fr" ? "Afficher le mot de passe" : "Show password");

  return (
    <div>
      <Label htmlFor={id} className="mb-1.5 block text-xs font-semibold">{label}</Label>
      <div className="relative">
        <Input id={id} type={visible ? "text" : "password"} autoComplete="new-password" minLength={8} value={value} onChange={(event) => onChange(event.target.value)} className="h-11 pr-11" required />
        <button type="button" onClick={() => setVisible((current) => !current)} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground transition hover:text-terre" aria-label={actionLabel} title={actionLabel}>
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function resolveResetError(error: unknown, locale: "fr" | "en") {
  const message = typeof error === "string" ? error.trim() : "";
  if (!message || /configur|supabase|service[ _-]?role|api[ _-]?key/i.test(message)) {
    return locale === "fr" ? "Le mot de passe n'a pas pu être modifié." : "The password could not be updated.";
  }
  return message;
}
