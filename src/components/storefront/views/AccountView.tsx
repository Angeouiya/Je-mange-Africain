"use client";

import { FormEvent, useEffect, useState } from "react";
import { User, ArrowLeft, MailCheck, X, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { BrandLockup } from "@/components/shared/BrandLockup";
import { Checkbox } from "@/components/ui/checkbox";
import { LEGAL_PATHS } from "@/lib/legal";
import { AccountWorkspace } from "@/components/storefront/account/AccountWorkspace";

type AuthMode = "login" | "register" | "forgot";

const emptyRegistration = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  termsAccepted: false,
  privacyAccepted: false,
};

export function AccountView() {
  const locale = useStore((s) => s.locale);
  const customer = useStore((s) => s.customer);
  const setCustomer = useStore((s) => s.setCustomer);
  const setAddresses = useStore((s) => s.setAddresses);
  const mergeSavedItems = useStore((s) => s.mergeSavedItems);
  const navigate = useStore((s) => s.navigate);
  const params = useStore((s) => s.params);
  const t = dict[locale];
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [registration, setRegistration] = useState(emptyRegistration);
  const [authStatus, setAuthStatus] = useState<"idle" | "busy" | "error" | "success">("idle");
  const [authMessage, setAuthMessage] = useState("");

  useEffect(() => {
    if (customer) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && authStatus !== "busy") navigate(params.returnView === "checkout" ? "cart" : "home");
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [authStatus, customer, navigate, params.returnView]);

  const changeAuthMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setAuthStatus("idle");
    setAuthMessage("");
  };

  const submitLogin = async (event: FormEvent) => {
    event.preventDefault();
    setAuthStatus("busy");
    setAuthMessage("");
    const response = await fetch("/api/auth/customer/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok || !payload.customer) {
      setAuthStatus("error");
      setAuthMessage(payload.error || (locale === "fr" ? "Connexion momentanément indisponible." : "Sign-in is temporarily unavailable."));
      return;
    }
    setCustomer(payload.customer);
    setAddresses(payload.addresses || []);
    mergeSavedItems(payload.favoriteProductIds || [], payload.savedRecipeIds || []);
    setAuthStatus("idle");
    if (params.returnView) navigate(params.returnView);
  };

  const submitRegistration = async (event: FormEvent) => {
    event.preventDefault();
    if (registration.password !== registration.confirmPassword) {
      setAuthStatus("error");
      setAuthMessage(locale === "fr" ? "Les deux mots de passe doivent être identiques." : "Both passwords must match.");
      return;
    }
    setAuthStatus("busy");
    setAuthMessage("");
    const response = await fetch("/api/auth/customer/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(registration),
    }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok) {
      setAuthStatus("error");
      setAuthMessage(payload.error || (locale === "fr" ? "Inscription momentanément indisponible." : "Registration is temporarily unavailable."));
      return;
    }
    if (payload.customer) {
      setCustomer(payload.customer);
      setAddresses(payload.addresses || []);
      mergeSavedItems(payload.favoriteProductIds || [], payload.savedRecipeIds || []);
      setAuthStatus("idle");
      if (params.returnView) navigate(params.returnView);
      return;
    }
    setAuthStatus("success");
    setAuthMessage(locale === "fr" ? "Votre compte est créé. Consultez votre e-mail pour confirmer votre adresse, puis connectez-vous." : "Your account is ready. Check your email to confirm your address, then sign in.");
  };

  const submitRecovery = async (event: FormEvent) => {
    event.preventDefault();
    setAuthStatus("busy");
    setAuthMessage("");
    const response = await fetch("/api/auth/customer/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: identifier }),
    }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok) {
      setAuthStatus("error");
      setAuthMessage(payload.error || (locale === "fr" ? "Envoi momentanément indisponible." : "Email is temporarily unavailable."));
      return;
    }
    setAuthStatus("success");
    setAuthMessage(locale === "fr" ? "Si un compte correspond à cette adresse, un lien de modification vient d'être envoyé." : "If an account matches this address, a reset link has just been sent.");
  };

  if (!customer) {
    return (
      <div role="dialog" aria-modal="true" aria-labelledby="customer-auth-title" className="fixed inset-0 z-[80] overflow-y-auto bg-white">
        <div className="african-kente-stripe sticky inset-x-0 top-0 z-10 h-[3px]" />
        <button type="button" onClick={() => navigate(params.returnView === "checkout" ? "cart" : "home")} disabled={authStatus === "busy"} className="fixed right-4 top-4 z-20 grid h-11 w-11 place-items-center rounded-full border border-border bg-white text-charcoal shadow-sm transition hover:border-terre hover:text-terre disabled:opacity-50 sm:right-6 sm:top-6" aria-label={locale === "fr" ? "Fermer la connexion et revenir à la page précédente" : "Close sign-in and return to the previous page"}>
          <X className="h-5 w-5" />
        </button>
        <div className="mx-auto flex min-h-full w-full max-w-md items-start px-4 py-16 sm:items-center sm:py-12">
        <section className="w-full rounded-lg bg-white p-5 sm:border sm:border-charcoal/10 sm:p-7 sm:shadow-[0_26px_70px_-52px_rgba(24,26,24,0.6)]">
          <div className="mb-8 flex justify-center sm:justify-start">
            <BrandLockup size="large" />
          </div>
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-terre/10"><User className="h-6 w-6 text-terre" /></div>
            <div><h1 id="customer-auth-title" className="font-display text-2xl font-semibold text-charcoal">{authMode === "register" ? (locale === "fr" ? "Créer mon compte" : "Create my account") : authMode === "forgot" ? (locale === "fr" ? "Mot de passe oublié" : "Forgot password") : t.nav.login}</h1><p className="text-xs text-muted-foreground">{locale === "fr" ? "Votre compte, simplement et en toute sécurité." : "Simple, secure access to your account."}</p></div>
          </div>

          {authMode !== "forgot" ? (
            <div className="mt-6 grid grid-cols-2 rounded-lg bg-muted p-1" role="tablist" aria-label={locale === "fr" ? "Accès au compte" : "Account access"}>
              <button type="button" role="tab" aria-selected={authMode === "login"} onClick={() => changeAuthMode("login")} className={`min-h-10 rounded-md px-3 text-sm font-bold ${authMode === "login" ? "bg-white text-charcoal shadow-sm" : "text-muted-foreground"}`}>{locale === "fr" ? "Connexion" : "Sign in"}</button>
              <button type="button" role="tab" aria-selected={authMode === "register"} onClick={() => changeAuthMode("register")} className={`min-h-10 rounded-md px-3 text-sm font-bold ${authMode === "register" ? "bg-white text-charcoal shadow-sm" : "text-muted-foreground"}`}>{locale === "fr" ? "Inscription" : "Register"}</button>
            </div>
          ) : null}

          {authMode === "login" ? (
            <form onSubmit={submitLogin} className="mt-5 space-y-4">
              <div><Label htmlFor="customer-identifier" className="mb-1 block text-xs font-semibold">{locale === "fr" ? "E-mail ou numéro de téléphone" : "Email or phone number"}</Label><Input id="customer-identifier" autoComplete="username" value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="vous@exemple.fr ou +33..." required /></div>
              <PasswordInput id="customer-password" label={locale === "fr" ? "Mot de passe" : "Password"} autoComplete="current-password" value={password} onChange={setPassword} locale={locale} />
              <button type="button" onClick={() => changeAuthMode("forgot")} className="text-xs font-bold text-terre hover:underline">{locale === "fr" ? "Mot de passe oublié ?" : "Forgot password?"}</button>
              <AuthMessage status={authStatus} message={authMessage} />
              <Button type="submit" disabled={authStatus === "busy"} className="w-full bg-terre text-cream hover:bg-terre-dark">{authStatus === "busy" ? (locale === "fr" ? "Connexion..." : "Signing in...") : t.nav.login}</Button>
            </form>
          ) : authMode === "register" ? (
            <form onSubmit={submitRegistration} className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3"><div><Label htmlFor="register-first-name" className="mb-1 block text-xs font-semibold">{t.checkout.firstName}</Label><Input id="register-first-name" autoComplete="given-name" value={registration.firstName} onChange={(event) => setRegistration({ ...registration, firstName: event.target.value })} required /></div><div><Label htmlFor="register-last-name" className="mb-1 block text-xs font-semibold">{t.checkout.lastName}</Label><Input id="register-last-name" autoComplete="family-name" value={registration.lastName} onChange={(event) => setRegistration({ ...registration, lastName: event.target.value })} required /></div></div>
              <div><Label htmlFor="register-email" className="mb-1 block text-xs font-semibold">E-mail</Label><Input id="register-email" type="email" autoComplete="email" value={registration.email} onChange={(event) => setRegistration({ ...registration, email: event.target.value })} required /></div>
              <div><Label htmlFor="register-phone" className="mb-1 block text-xs font-semibold">{locale === "fr" ? "Numéro de téléphone" : "Phone number"}</Label><Input id="register-phone" type="tel" autoComplete="tel" value={registration.phone} onChange={(event) => setRegistration({ ...registration, phone: event.target.value })} placeholder="+33 6 00 00 00 00" required /></div>
              <PasswordInput id="register-password" label={locale === "fr" ? "Mot de passe (8 caractères minimum)" : "Password (8 characters minimum)"} autoComplete="new-password" value={registration.password} onChange={(value) => setRegistration({ ...registration, password: value })} locale={locale} />
              <PasswordInput id="register-confirm-password" label={locale === "fr" ? "Confirmer le mot de passe" : "Confirm password"} autoComplete="new-password" value={registration.confirmPassword} onChange={(value) => setRegistration({ ...registration, confirmPassword: value })} locale={locale} />
              <div className="space-y-3 rounded-lg border border-border bg-muted/35 p-3">
                <p className="text-[11px] font-bold text-charcoal">{locale === "fr" ? "Accords obligatoires" : "Required agreements"}</p>
                <LegalCheckbox
                  id="register-terms"
                  checked={registration.termsAccepted}
                  onCheckedChange={(checked) => setRegistration({ ...registration, termsAccepted: checked })}
                  label={locale === "fr" ? "J'ai lu et j'accepte les conditions générales d'utilisation et de vente." : "I have read and accept the terms of use and sale."}
                  linkLabel={locale === "fr" ? "Lire les CGU" : "Read the terms"}
                  href={LEGAL_PATHS.terms}
                />
                <LegalCheckbox
                  id="register-privacy"
                  checked={registration.privacyAccepted}
                  onCheckedChange={(checked) => setRegistration({ ...registration, privacyAccepted: checked })}
                  label={locale === "fr" ? "J'ai lu et j'accepte la politique de confidentialité et le traitement nécessaire à la gestion de mon compte." : "I have read and accept the privacy policy and the processing required to manage my account."}
                  linkLabel={locale === "fr" ? "Lire la politique" : "Read the policy"}
                  href={LEGAL_PATHS.privacy}
                />
              </div>
              <AuthMessage status={authStatus} message={authMessage} />
              <Button type="submit" disabled={authStatus === "busy" || !registration.termsAccepted || !registration.privacyAccepted} className="w-full bg-terre text-cream hover:bg-terre-dark">{authStatus === "busy" ? (locale === "fr" ? "Création..." : "Creating...") : (locale === "fr" ? "Créer mon compte" : "Create my account")}</Button>
            </form>
          ) : (
            <form onSubmit={submitRecovery} className="mt-5 space-y-4">
              <p className="text-sm leading-relaxed text-muted-foreground">{locale === "fr" ? "Saisissez l'e-mail utilisé lors de votre inscription. Nous vous enverrons un lien sécurisé pour choisir un nouveau mot de passe." : "Enter the email used to register. We will send a secure link to choose a new password."}</p>
              <div><Label htmlFor="recovery-email" className="mb-1 block text-xs font-semibold">E-mail</Label><Input id="recovery-email" type="email" autoComplete="email" value={identifier} onChange={(event) => setIdentifier(event.target.value)} required /></div>
              <AuthMessage status={authStatus} message={authMessage} successIcon />
              <Button type="submit" disabled={authStatus === "busy" || authStatus === "success"} className="w-full bg-terre text-cream hover:bg-terre-dark">{authStatus === "busy" ? (locale === "fr" ? "Envoi..." : "Sending...") : (locale === "fr" ? "Envoyer le lien" : "Send reset link")}</Button>
              <button type="button" onClick={() => changeAuthMode("login")} className="inline-flex items-center gap-1.5 text-xs font-bold text-charcoal hover:text-terre"><ArrowLeft className="h-3.5 w-3.5" /> {locale === "fr" ? "Retour à la connexion" : "Back to sign in"}</button>
            </form>
          )}
          <p className="mt-6 text-center text-[10px] leading-5 text-muted-foreground">
            {locale === "fr" ? "L'utilisation de Je mange Africain est régie par nos " : "Using Je mange Africain is governed by our "}
            <a href={LEGAL_PATHS.terms} target="_blank" rel="noreferrer" className="font-semibold text-terre hover:underline">{locale === "fr" ? "conditions générales" : "terms"}</a>
            {locale === "fr" ? " et notre " : " and "}
            <a href={LEGAL_PATHS.privacy} target="_blank" rel="noreferrer" className="font-semibold text-terre hover:underline">{locale === "fr" ? "politique de confidentialité" : "privacy policy"}</a>.
          </p>
        </section>
        </div>
      </div>
    );
  }

  return <AccountWorkspace />;
}

function LegalCheckbox({ id, checked, onCheckedChange, label, linkLabel, href }: { id: string; checked: boolean; onCheckedChange: (checked: boolean) => void; label: string; linkLabel: string; href: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Checkbox id={id} checked={checked} onCheckedChange={(value) => onCheckedChange(value === true)} className="mt-0.5" required />
      <label htmlFor={id} className="min-w-0 text-[11px] leading-5 text-charcoal">
        {label}{" "}
        <a href={href} target="_blank" rel="noreferrer" className="font-bold text-terre hover:underline" onClick={(event) => event.stopPropagation()}>{linkLabel}</a>
      </label>
    </div>
  );
}

function PasswordInput({ id, label, autoComplete, value, onChange, locale }: { id: string; label: string; autoComplete: "current-password" | "new-password"; value: string; onChange: (value: string) => void; locale: "fr" | "en" }) {
  const [visible, setVisible] = useState(false);
  const actionLabel = visible
    ? (locale === "fr" ? "Masquer le mot de passe" : "Hide password")
    : (locale === "fr" ? "Afficher le mot de passe" : "Show password");

  return (
    <div>
      <Label htmlFor={id} className="mb-1 block text-xs font-semibold">{label}</Label>
      <div className="relative">
        <Input id={id} type={visible ? "text" : "password"} autoComplete={autoComplete} minLength={8} value={value} onChange={(event) => onChange(event.target.value)} className="pr-11" required />
        <button type="button" onClick={() => setVisible((current) => !current)} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground transition hover:text-terre" aria-label={actionLabel} title={actionLabel}>
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function AuthMessage({ status, message, successIcon = false }: { status: "idle" | "busy" | "error" | "success"; message: string; successIcon?: boolean }) {
  if (!message || status === "idle" || status === "busy") return null;
  const success = status === "success";
  return <div role={success ? "status" : "alert"} className={`flex gap-2 rounded-lg border p-3 text-xs leading-relaxed ${success ? "border-forest/25 bg-forest/5 text-forest" : "border-red-200 bg-red-50 text-red-800"}`}>{success && successIcon ? <MailCheck className="mt-0.5 h-4 w-4 shrink-0" /> : null}<span>{message}</span></div>;
}
