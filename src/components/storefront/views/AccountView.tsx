"use client";

import { type FormEvent, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  AtSign,
  BookHeart,
  Check,
  CheckCircle2,
  ClipboardList,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  MailCheck,
  MapPin,
  Phone,
  ShieldCheck,
  ShoppingBag,
  User,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { LEGAL_PATHS } from "@/lib/legal";
import { BrandLockup } from "@/components/shared/BrandLockup";
import { LanguageSwitch } from "@/components/shared/LanguageSwitch";
import { AccountWorkspace } from "@/components/storefront/account/AccountWorkspace";
import { CustomerAuthVisualPanel } from "@/components/storefront/CustomerAuthVisualPanel";

type AuthMode = "login" | "register" | "forgot";
type AuthStatus = "idle" | "busy" | "error" | "success";

interface RegistrationState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  termsAccepted: boolean;
  privacyAccepted: boolean;
}

const EMPTY_REGISTRATION: RegistrationState = {
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
  const locale = useStore((state) => state.locale);
  const customer = useStore((state) => state.customer);
  const setCustomer = useStore((state) => state.setCustomer);
  const setAddresses = useStore((state) => state.setAddresses);
  const mergeSavedItems = useStore((state) => state.mergeSavedItems);
  const navigate = useStore((state) => state.navigate);
  const params = useStore((state) => state.params);
  const t = dict[locale];
  const isFr = locale === "fr";
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [registration, setRegistration] = useState<RegistrationState>(EMPTY_REGISTRATION);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("idle");
  const [authMessage, setAuthMessage] = useState("");

  const passwordsMatch = registration.confirmPassword.length > 0 && registration.password === registration.confirmPassword;
  const registrationPasswordsReady = registration.password.length >= 8 && registration.confirmPassword.length >= 8 && passwordsMatch;
  const registrationIdentityReady = registration.firstName.trim().length >= 2
    && registration.lastName.trim().length >= 2
    && /^\S+@\S+\.\S+$/.test(registration.email)
    && /^\+?[\d\s().-]{8,}$/.test(registration.phone);
  const registrationLegalReady = registration.termsAccepted && registration.privacyAccepted;
  const registrationSteps = [registrationIdentityReady, registrationPasswordsReady, registrationLegalReady];
  const completedRegistrationSteps = registrationSteps.filter(Boolean).length;
  const registrationReady = completedRegistrationSteps === registrationSteps.length;

  const closeAuth = () => navigate(params.returnView === "checkout" ? "cart" : "home");

  const clearFeedback = () => {
    if (authStatus === "idle") return;
    setAuthStatus("idle");
    setAuthMessage("");
  };

  const changeAuthMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setAuthStatus("idle");
    setAuthMessage("");
  };

  const updateIdentifier = (value: string) => {
    setIdentifier(value);
    clearFeedback();
  };

  const updatePassword = (value: string) => {
    setPassword(value);
    clearFeedback();
  };

  const updateRegistration = <K extends keyof RegistrationState,>(field: K, value: RegistrationState[K]) => {
    setRegistration((current) => ({ ...current, [field]: value }));
    clearFeedback();
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
      setAuthMessage(resolveAuthError(payload.error, locale, "Connexion momentanément indisponible.", "Sign-in is temporarily unavailable."));
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
    if (!registrationReady) {
      setAuthStatus("error");
      setAuthMessage(isFr ? "Complétez les trois étapes avant de créer votre compte." : "Complete all three steps before creating your account.");
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
      setAuthMessage(resolveAuthError(payload.error, locale, "Inscription momentanément indisponible.", "Registration is temporarily unavailable."));
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
    setAuthMessage(isFr ? "Votre compte est créé. Consultez votre e-mail pour confirmer votre adresse, puis connectez-vous." : "Your account is ready. Check your email to confirm your address, then sign in.");
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
      setAuthMessage(resolveAuthError(payload.error, locale, "Envoi momentanément indisponible.", "Email is temporarily unavailable."));
      return;
    }
    setAuthStatus("success");
    setAuthMessage(isFr ? "Si un compte correspond à cette adresse, un lien de modification vient d'être envoyé." : "If an account matches this address, a reset link has just been sent.");
  };

  if (customer) return <AccountWorkspace />;

  const title = authMode === "register"
    ? (isFr ? "Créez votre espace personnel" : "Create your personal space")
    : authMode === "forgot"
      ? (isFr ? "Retrouvez l'accès à votre compte" : "Recover access to your account")
      : t.nav.login;
  const description = authMode === "register"
    ? (isFr ? "Trois étapes claires pour synchroniser vos achats, recettes et livraisons." : "Three clear steps to sync your shopping, recipes and deliveries.")
    : authMode === "forgot"
      ? (isFr ? "Recevez un lien sécurisé sur l'adresse associée à votre compte." : "Receive a secure link at the address connected to your account.")
      : (isFr ? "Retrouvez votre panier, vos favoris et le suivi de vos commandes." : "Return to your basket, saved items and order tracking.");

  return (
    <Dialog open onOpenChange={(open) => { if (!open && authStatus !== "busy") closeAuth(); }}>
      <DialogContent showCloseButton={false} className="inset-0 left-0 top-0 z-[80] block h-dvh w-screen max-w-none translate-x-0 translate-y-0 overflow-hidden rounded-none border-0 bg-white p-0 shadow-none ring-0 data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100 sm:max-w-none">
        <div className="african-kente-stripe fixed inset-x-0 top-0 z-30 h-[3px]" />
        <div className="fixed left-4 top-4 z-30 sm:left-6 sm:top-6 lg:left-auto lg:right-20"><LanguageSwitch compact /></div>
        <DialogClose asChild>
          <button type="button" disabled={authStatus === "busy"} className="fixed right-4 top-4 z-30 grid h-11 w-11 place-items-center rounded-full border border-burgundy/10 bg-white text-charcoal shadow-[0_10px_28px_-22px_rgba(90,38,50,0.7)] transition hover:border-terre/30 hover:text-terre disabled:opacity-50 sm:right-6 sm:top-6" aria-label={isFr ? "Fermer la connexion et revenir à la page précédente" : "Close sign-in and return to the previous page"}>
            <X className="h-5 w-5" />
          </button>
        </DialogClose>

        <div className="grid h-full min-h-0 lg:grid-cols-[minmax(0,1.08fr)_minmax(32rem,0.92fr)]">
          <CustomerAuthVisualPanel locale={locale} />

          <div className="min-h-0 overflow-y-auto bg-white" data-testid="customer-auth-form-scroll">
            <div className="mx-auto flex min-h-full w-full max-w-[38rem] items-start px-4 pb-10 pt-20 sm:items-center sm:px-10 sm:py-16 lg:px-8 xl:px-11">
              <section className="w-full" data-testid="customer-auth-workspace">
                <div className="mb-7 flex justify-center sm:justify-start lg:hidden" data-testid="customer-auth-mobile-brand">
                  <BrandLockup size="large" locale={locale} className="[&>span:first-child]:h-20 [&>span:first-child]:w-20" />
                </div>

                <div className="flex items-start gap-3.5">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md border border-terre/10 bg-[linear-gradient(145deg,rgba(185,71,43,0.12),rgba(242,169,0,0.06))] text-terre">
                    {authMode === "register" ? <User className="h-5 w-5" /> : authMode === "forgot" ? <KeyRound className="h-5 w-5" /> : <LockKeyhole className="h-5 w-5" />}
                  </span>
                  <div className="min-w-0">
                    <p className="mb-1 text-[9px] font-black uppercase text-terre">{isFr ? "Espace client privé" : "Private customer space"}</p>
                    <DialogTitle id="customer-auth-title" className="font-display text-[1.7rem] font-semibold leading-[1.08] text-charcoal sm:text-[2rem]">{title}</DialogTitle>
                    <DialogDescription className="mt-2 max-w-lg text-xs leading-5 text-muted-foreground">{description}</DialogDescription>
                  </div>
                </div>

                {params.returnView === "checkout" ? (
                  <div className="mt-5 flex items-start gap-3 rounded-md border border-gold/35 bg-gold/[0.08] p-3 text-charcoal" data-testid="auth-return-context">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-white text-terre"><ShoppingBag className="h-4 w-4" /></span>
                    <div><p className="text-xs font-black">{isFr ? "Votre panier vous attend" : "Your basket is waiting"}</p><p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">{isFr ? "Connectez-vous pour reprendre directement la livraison et le paiement." : "Sign in to continue directly with delivery and payment."}</p></div>
                  </div>
                ) : null}

                {authMode !== "forgot" ? (
                  <div className="mt-6 grid grid-cols-2 rounded-md border border-burgundy/8 bg-[#F8F4F3] p-1" role="tablist" aria-label={isFr ? "Accès au compte" : "Account access"}>
                    <AuthTab selected={authMode === "login"} label={isFr ? "Connexion" : "Sign in"} icon={LockKeyhole} controls="customer-login-panel" onClick={() => changeAuthMode("login")} />
                    <AuthTab selected={authMode === "register"} label={isFr ? "Inscription" : "Register"} icon={User} controls="customer-register-panel" onClick={() => changeAuthMode("register")} />
                  </div>
                ) : null}

                {authMode === "login" ? (
                  <div id="customer-login-panel" role="tabpanel" aria-labelledby="customer-login-panel-tab" className="mt-5">
                    <form onSubmit={submitLogin} className="space-y-4" aria-label={isFr ? "Formulaire de connexion" : "Sign-in form"}>
                      <AuthTextField id="customer-identifier" label={isFr ? "E-mail ou numéro de téléphone" : "Email or phone number"} icon={AtSign} autoFocus autoComplete="username" value={identifier} onChange={updateIdentifier} placeholder={isFr ? "vous@exemple.fr ou +33..." : "you@example.com or +44..."} />
                      <PasswordInput id="customer-password" label={isFr ? "Mot de passe" : "Password"} autoComplete="current-password" value={password} onChange={updatePassword} locale={locale} />
                      <div className="flex min-h-9 items-center justify-between gap-3"><span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5 text-burgundy" />{isFr ? "Accès chiffré" : "Encrypted access"}</span><button type="button" onClick={() => changeAuthMode("forgot")} className="min-h-9 text-xs font-bold text-terre hover:underline">{isFr ? "Mot de passe oublié ?" : "Forgot password?"}</button></div>
                      <AuthMessage status={authStatus} message={authMessage} />
                      <Button type="submit" disabled={authStatus === "busy"} className="min-h-12 w-full justify-between bg-terre px-4 text-white shadow-[0_16px_34px_-24px_rgba(185,71,43,0.9)] hover:bg-terre-dark"><span>{authStatus === "busy" ? (isFr ? "Connexion..." : "Signing in...") : t.nav.login}</span><ArrowRight className="h-4 w-4" /></Button>
                      <AuthCapabilityRail locale={locale} />
                    </form>
                  </div>
                ) : authMode === "register" ? (
                  <div id="customer-register-panel" role="tabpanel" aria-labelledby="customer-register-panel-tab" className="mt-5">
                    <form onSubmit={submitRegistration} className="space-y-5" aria-label={isFr ? "Formulaire d'inscription" : "Registration form"}>
                    <RegistrationProgress locale={locale} steps={registrationSteps} />

                    <fieldset className="min-w-0 border-t border-charcoal/8 pt-4">
                      <legend className="px-0 text-xs font-black text-charcoal">{isFr ? "1. Vos coordonnées" : "1. Your details"}</legend>
                      <p className="mt-1 text-[10px] leading-4 text-muted-foreground">{isFr ? "Utilisées pour la facture et le suivi de livraison." : "Used for invoices and delivery tracking."}</p>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <AuthTextField id="register-first-name" label={t.checkout.firstName} icon={User} autoFocus autoComplete="given-name" value={registration.firstName} onChange={(value) => updateRegistration("firstName", value)} />
                        <AuthTextField id="register-last-name" label={t.checkout.lastName} icon={User} autoComplete="family-name" value={registration.lastName} onChange={(value) => updateRegistration("lastName", value)} />
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <AuthTextField id="register-email" label="E-mail" icon={AtSign} type="email" autoComplete="email" value={registration.email} onChange={(value) => updateRegistration("email", value)} />
                        <AuthTextField id="register-phone" label={isFr ? "Numéro de téléphone" : "Phone number"} icon={Phone} type="tel" autoComplete="tel" value={registration.phone} onChange={(value) => updateRegistration("phone", value)} placeholder={isFr ? "+33 6 00 00 00 00" : "+44 7 0000 0000"} />
                      </div>
                    </fieldset>

                    <fieldset className="min-w-0 border-t border-charcoal/8 pt-4">
                      <legend className="px-0 text-xs font-black text-charcoal">{isFr ? "2. Votre sécurité" : "2. Your security"}</legend>
                      <p className="mt-1 text-[10px] leading-4 text-muted-foreground">{isFr ? "Saisissez le même mot de passe deux fois." : "Enter the same password twice."}</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <PasswordInput id="register-password" label={isFr ? "Mot de passe (8 caractères minimum)" : "Password (8 characters minimum)"} autoComplete="new-password" value={registration.password} onChange={(value) => updateRegistration("password", value)} locale={locale} />
                        <PasswordInput id="register-confirm-password" label={isFr ? "Confirmer le mot de passe" : "Confirm password"} autoComplete="new-password" value={registration.confirmPassword} onChange={(value) => updateRegistration("confirmPassword", value)} locale={locale} />
                      </div>
                      <PasswordStrength password={registration.password} locale={locale} />
                      {registration.confirmPassword ? <p aria-live="polite" className={`mt-2 flex min-h-6 items-center gap-1.5 text-[11px] font-semibold ${passwordsMatch ? "text-burgundy" : "text-destructive"}`}>{passwordsMatch ? <CheckCircle2 className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}{passwordsMatch ? (isFr ? "Les mots de passe correspondent." : "Passwords match.") : (isFr ? "Les mots de passe ne correspondent pas." : "Passwords do not match.")}</p> : null}
                    </fieldset>

                    <fieldset className="min-w-0 rounded-md border border-burgundy/12 bg-[linear-gradient(145deg,rgba(138,48,66,0.045),rgba(242,169,0,0.035))] p-3.5">
                      <legend className="px-1 text-xs font-black text-charcoal">{isFr ? "3. Accords obligatoires" : "3. Required agreements"}</legend>
                      <p className="mb-3 mt-1 px-1 text-[10px] leading-4 text-muted-foreground">{isFr ? "Ces deux validations sont nécessaires pour ouvrir le compte." : "Both confirmations are required to open the account."}</p>
                      <div className="space-y-3">
                        <LegalCheckbox id="register-terms" checked={registration.termsAccepted} onCheckedChange={(checked) => updateRegistration("termsAccepted", checked)} label={isFr ? "J'ai lu et j'accepte les conditions générales d'utilisation et de vente." : "I have read and accept the terms of use and sale."} linkLabel={isFr ? "Lire les CGU" : "Read the terms"} href={`${LEGAL_PATHS.terms}?lang=${locale}`} />
                        <LegalCheckbox id="register-privacy" checked={registration.privacyAccepted} onCheckedChange={(checked) => updateRegistration("privacyAccepted", checked)} label={isFr ? "J'ai lu et j'accepte la politique de confidentialité et le traitement nécessaire à la gestion de mon compte." : "I have read and accept the privacy policy and the processing required to manage my account."} linkLabel={isFr ? "Lire la politique" : "Read the policy"} href={`${LEGAL_PATHS.privacy}?lang=${locale}`} />
                      </div>
                    </fieldset>

                      <AuthMessage status={authStatus} message={authMessage} />
                      <Button type="submit" disabled={authStatus === "busy" || !registrationReady} className="min-h-12 w-full justify-between bg-terre px-4 text-white shadow-[0_16px_34px_-24px_rgba(185,71,43,0.9)] hover:bg-terre-dark"><span>{authStatus === "busy" ? (isFr ? "Création..." : "Creating...") : (isFr ? "Créer mon compte" : "Create my account")}</span><span className="flex items-center gap-2 text-[10px] font-black"><span>{completedRegistrationSteps}/3</span><ArrowRight className="h-4 w-4" /></span></Button>
                    </form>
                  </div>
                ) : (
                  <form onSubmit={submitRecovery} className="mt-6 space-y-5" aria-label={isFr ? "Récupération du compte" : "Account recovery"}>
                    <RecoverySteps locale={locale} />
                    <AuthTextField id="recovery-email" label="E-mail" icon={AtSign} type="email" autoFocus autoComplete="email" value={identifier} onChange={updateIdentifier} placeholder={isFr ? "vous@exemple.fr" : "you@example.com"} />
                    <AuthMessage status={authStatus} message={authMessage} successIcon />
                    <Button type="submit" disabled={authStatus === "busy" || authStatus === "success"} className="min-h-12 w-full justify-between bg-terre px-4 text-white hover:bg-terre-dark"><span>{authStatus === "busy" ? (isFr ? "Envoi..." : "Sending...") : (isFr ? "Envoyer le lien sécurisé" : "Send secure link")}</span><ArrowRight className="h-4 w-4" /></Button>
                    <button type="button" onClick={() => changeAuthMode("login")} className="inline-flex min-h-10 items-center gap-1.5 text-xs font-bold text-charcoal hover:text-terre"><ArrowLeft className="h-3.5 w-3.5" />{isFr ? "Retour à la connexion" : "Back to sign in"}</button>
                  </form>
                )}

                <p className="mt-6 border-t border-charcoal/8 pt-4 text-center text-[10px] leading-5 text-muted-foreground">
                  {isFr ? "L'utilisation de Je mange Africain est régie par nos " : "Using Je mange Africain is governed by our "}
                  <a href={`${LEGAL_PATHS.terms}?lang=${locale}`} target="_blank" rel="noreferrer" className="font-bold text-terre hover:underline">{isFr ? "conditions générales" : "terms"}</a>
                  {isFr ? " et notre " : " and "}
                  <a href={`${LEGAL_PATHS.privacy}?lang=${locale}`} target="_blank" rel="noreferrer" className="font-bold text-terre hover:underline">{isFr ? "politique de confidentialité" : "privacy policy"}</a>.
                </p>
              </section>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AuthTab({ selected, label, icon: Icon, controls, onClick }: { selected: boolean; label: string; icon: LucideIcon; controls: string; onClick: () => void }) {
  return <button id={`${controls}-tab`} type="button" role="tab" aria-selected={selected} aria-controls={controls} onClick={onClick} className={`relative flex min-h-11 items-center justify-center gap-2 rounded-md px-3 text-sm font-bold transition ${selected ? "border border-terre/12 bg-white text-charcoal shadow-[0_8px_22px_-20px_rgba(90,38,50,0.7)]" : "text-muted-foreground hover:bg-white/55 hover:text-charcoal"}`}><Icon className={`h-4 w-4 ${selected ? "text-terre" : ""}`} />{label}{selected ? <span className="absolute inset-x-8 bottom-0 h-0.5 rounded-full bg-gold" aria-hidden="true" /> : null}</button>;
}

function AuthTextField({ id, label, icon: Icon, type = "text", autoComplete, value, onChange, placeholder, autoFocus = false }: { id: string; label: string; icon: LucideIcon; type?: string; autoComplete?: string; value: string; onChange: (value: string) => void; placeholder?: string; autoFocus?: boolean }) {
  return <div className="min-w-0"><Label htmlFor={id} className="mb-1.5 block text-xs font-bold text-charcoal">{label}</Label><div className="relative"><Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-terre" /><Input id={id} type={type} autoFocus={autoFocus} autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-11 rounded-md border-charcoal/10 bg-white pl-9 focus:border-terre" required /></div></div>;
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
  const actionLabel = visible ? (locale === "fr" ? "Masquer le mot de passe" : "Hide password") : (locale === "fr" ? "Afficher le mot de passe" : "Show password");
  return (
    <div className="min-w-0">
      <Label htmlFor={id} className="mb-1.5 block text-xs font-bold text-charcoal">{label}</Label>
      <div className="relative">
        <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-terre" />
        <Input id={id} type={visible ? "text" : "password"} autoComplete={autoComplete} minLength={8} value={value} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-md border-charcoal/10 bg-white pl-9 pr-11 focus:border-terre" required />
        <button type="button" onClick={() => setVisible((current) => !current)} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground transition hover:text-terre" aria-label={actionLabel} title={actionLabel}>{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
      </div>
    </div>
  );
}

function RegistrationProgress({ locale, steps }: { locale: "fr" | "en"; steps: boolean[] }) {
  const isFr = locale === "fr";
  const labels = isFr ? ["Coordonnées", "Sécurité", "Accords"] : ["Details", "Security", "Agreements"];
  const completed = steps.filter(Boolean).length;
  const progress = Math.round((completed / steps.length) * 100);
  return (
    <section className="rounded-md border border-burgundy/10 bg-[#FFFCFA] p-3" aria-labelledby="registration-progress-title" data-testid="registration-progress">
      <div className="flex items-center justify-between gap-3"><div><p className="text-[9px] font-black uppercase text-terre">{isFr ? "Ouverture du compte" : "Account setup"}</p><h2 id="registration-progress-title" className="mt-0.5 text-xs font-black text-charcoal">{completed === 3 ? (isFr ? "Votre dossier est prêt" : "Your details are ready") : (isFr ? `${completed} étape(s) sur 3` : `${completed} of 3 steps`)}</h2></div><span className="text-sm font-black tabular-nums text-burgundy">{progress}%</span></div>
      <div className="mt-3 grid grid-cols-3 gap-1.5" role="progressbar" aria-label={isFr ? "Progression de l'inscription" : "Registration progress"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
        {steps.map((complete, index) => <div key={labels[index]} className={`min-w-0 rounded-md border px-2 py-2 ${complete ? "border-burgundy/15 bg-burgundy/[0.065]" : "border-charcoal/8 bg-white"}`}><span className={`grid h-5 w-5 place-items-center rounded-md ${complete ? "bg-burgundy text-white" : "bg-muted text-muted-foreground"}`}>{complete ? <Check className="h-3 w-3" /> : <span className="text-[9px] font-black">{index + 1}</span>}</span><span className="mt-1.5 block truncate text-[9px] font-black text-charcoal">{labels[index]}</span></div>)}
      </div>
    </section>
  );
}

function PasswordStrength({ password, locale }: { password: string; locale: "fr" | "en" }) {
  const isFr = locale === "fr";
  const score = [password.length >= 8, password.length >= 12, /[A-Za-z]/.test(password) && /\d/.test(password), /[^A-Za-z\d]/.test(password)].filter(Boolean).length;
  const level = score >= 4 ? (isFr ? "Très solide" : "Very strong") : score >= 3 ? (isFr ? "Solide" : "Strong") : score >= 2 ? (isFr ? "Correct" : "Fair") : (isFr ? "À renforcer" : "Needs strengthening");
  return <div className="mt-3" aria-live="polite"><div className="flex items-center justify-between text-[9px] font-bold text-muted-foreground"><span>{isFr ? "Force du mot de passe" : "Password strength"}</span><span className={score >= 3 ? "text-burgundy" : "text-terre"}>{password ? level : (isFr ? "8 caractères minimum" : "8 characters minimum")}</span></div><div className="mt-1.5 grid grid-cols-4 gap-1" aria-hidden="true">{Array.from({ length: 4 }).map((_, index) => <span key={index} className={`h-1 rounded-full ${index < score ? (score >= 3 ? "bg-burgundy" : "bg-terre") : "bg-muted"}`} />)}</div></div>;
}

function AuthCapabilityRail({ locale }: { locale: "fr" | "en" }) {
  const isFr = locale === "fr";
  const items = [
    { icon: ClipboardList, label: isFr ? "Commandes" : "Orders" },
    { icon: BookHeart, label: isFr ? "Favoris" : "Saved" },
    { icon: MapPin, label: isFr ? "Adresses" : "Addresses" },
  ];
  return <div className="grid grid-cols-3 divide-x divide-charcoal/8 border-y border-charcoal/8 py-3" aria-label={isFr ? "Services liés au compte" : "Account services"}>{items.map((item) => <div key={item.label} className="min-w-0 px-2 text-center"><item.icon className="mx-auto h-4 w-4 text-terre" /><span className="mt-1 block truncate text-[9px] font-black text-charcoal">{item.label}</span></div>)}</div>;
}

function RecoverySteps({ locale }: { locale: "fr" | "en" }) {
  const isFr = locale === "fr";
  const steps = [
    { icon: AtSign, title: isFr ? "Indiquez votre e-mail" : "Enter your email", detail: isFr ? "Adresse du compte" : "Account address" },
    { icon: MailCheck, title: isFr ? "Ouvrez le lien" : "Open the link", detail: isFr ? "Lien personnel" : "Personal link" },
    { icon: ShieldCheck, title: isFr ? "Choisissez le mot de passe" : "Choose the password", detail: isFr ? "Accès renouvelé" : "Access restored" },
  ];
  return <div className="grid grid-cols-3 gap-2" aria-label={isFr ? "Étapes de récupération" : "Recovery steps"}>{steps.map((step, index) => <div key={step.title} className="min-w-0 rounded-md border border-charcoal/8 bg-[#FFFCFA] p-2.5"><span className="flex items-center justify-between"><step.icon className="h-4 w-4 text-terre" /><span className="text-[9px] font-black text-burgundy">0{index + 1}</span></span><span className="mt-2 block text-[10px] font-black leading-4 text-charcoal">{step.title}</span><span className="mt-0.5 block text-[8px] leading-3 text-muted-foreground">{step.detail}</span></div>)}</div>;
}

function AuthMessage({ status, message, successIcon = false }: { status: AuthStatus; message: string; successIcon?: boolean }) {
  if (!message || status === "idle" || status === "busy") return null;
  const success = status === "success";
  return <div role={success ? "status" : "alert"} className={`flex gap-2 rounded-md border p-3 text-xs leading-5 ${success ? "border-burgundy/25 bg-burgundy/5 text-burgundy" : "border-destructive/25 bg-destructive/[0.06] text-destructive"}`}>{success && successIcon ? <MailCheck className="mt-0.5 h-4 w-4 shrink-0" /> : null}<span>{message}</span></div>;
}

function resolveAuthError(error: unknown, locale: "fr" | "en", fallbackFr: string, fallbackEn: string) {
  const message = typeof error === "string" ? error.trim() : "";
  if (!message || /configur|supabase|service[ _-]?role|api[ _-]?key/i.test(message)) return locale === "fr" ? fallbackFr : fallbackEn;
  return message;
}
