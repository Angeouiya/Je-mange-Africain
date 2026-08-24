"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  User, Package, Heart, ChefHat, Star, Wallet, LogOut, Settings, ArrowLeft, MailCheck, X, Eye, EyeOff, Bookmark, ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { useFetch } from "@/lib/use-fetch";
import { ProductCard } from "@/components/shared/ProductCard";
import { RecipeCard } from "@/components/shared/RecipeCard";
import { formatPrice } from "@/lib/format";
import { LogoutConfirmDialog } from "@/components/storefront/LogoutConfirmDialog";
import { BrandLockup } from "@/components/shared/BrandLockup";
import { Checkbox } from "@/components/ui/checkbox";
import { LEGAL_PATHS } from "@/lib/legal";

type AuthMode = "login" | "register" | "forgot";
type AccountSection = "profile" | "saved" | "settings";
type SecurityStatus = "idle" | "busy" | "success" | "error";

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
  const favorites = useStore((s) => s.favorites);
  const savedRecipes = useStore((s) => s.savedRecipes);
  const setLocale = useStore((s) => s.setLocale);
  const navigate = useStore((s) => s.navigate);
  const params = useStore((s) => s.params);
  const t = dict[locale];
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [registration, setRegistration] = useState(emptyRegistration);
  const [authStatus, setAuthStatus] = useState<"idle" | "busy" | "error" | "success">("idle");
  const [authMessage, setAuthMessage] = useState("");
  const [section, setSection] = useState<AccountSection>(params.accountSection || "profile");
  const [savedTab, setSavedTab] = useState<"products" | "recipes">("products");
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus>("idle");
  const [securityMessage, setSecurityMessage] = useState("");
  const { data: orderData } = useFetch(customer ? `/api/orders?locale=${locale}` : null, [customer?.id, locale]);

  useEffect(() => {
    if (params.accountSection) setSection(params.accountSection);
  }, [params.accountSection]);

  const requestPasswordChange = async () => {
    if (!customer || securityStatus === "busy") return;
    setSecurityStatus("busy");
    setSecurityMessage("");
    const response = await fetch("/api/auth/customer/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: customer.email }),
    }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok) {
      setSecurityStatus("error");
      setSecurityMessage(payload.error || (locale === "fr" ? "Envoi momentanément indisponible." : "Email is temporarily unavailable."));
      return;
    }
    setSecurityStatus("success");
    setSecurityMessage(locale === "fr" ? "Un lien sécurisé vient d'être envoyé à votre adresse e-mail." : "A secure link has just been sent to your email address.");
  };

  useEffect(() => {
    if (customer) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && authStatus !== "busy") navigate("home");
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [authStatus, customer, navigate]);

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
    setAuthStatus("idle");
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
      setAuthStatus("idle");
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
      <div role="dialog" aria-modal="true" aria-labelledby="customer-auth-title" className="fixed inset-0 z-[80] overflow-y-auto bg-cream">
        <div className="african-kente-stripe sticky inset-x-0 top-0 z-10 h-1" />
        <button type="button" onClick={() => navigate("home")} disabled={authStatus === "busy"} className="fixed right-4 top-4 z-20 grid h-11 w-11 place-items-center rounded-full border border-border bg-white text-charcoal shadow-sm transition hover:border-terre hover:text-terre disabled:opacity-50 sm:right-6 sm:top-6" aria-label={locale === "fr" ? "Fermer la connexion et revenir à l'accueil" : "Close sign-in and return home"}>
          <X className="h-5 w-5" />
        </button>
        <div className="mx-auto flex min-h-full w-full max-w-md items-start px-4 py-16 sm:items-center sm:py-12">
        <section className="w-full rounded-lg bg-white p-5 shadow-sm sm:border sm:border-border sm:p-7">
          <div className="mb-8 flex justify-center sm:justify-start">
            <BrandLockup size="large" />
          </div>
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-terre/10"><User className="h-6 w-6 text-terre" /></div>
            <div><h1 id="customer-auth-title" className="text-xl font-extrabold text-charcoal">{authMode === "register" ? (locale === "fr" ? "Créer mon compte" : "Create my account") : authMode === "forgot" ? (locale === "fr" ? "Mot de passe oublié" : "Forgot password") : t.nav.login}</h1><p className="text-xs text-muted-foreground">{locale === "fr" ? "Votre compte, simplement et en toute sécurité." : "Simple, secure access to your account."}</p></div>
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

  const nav: Array<{ id: AccountSection; icon: LucideIcon; label: string }> = [
    { id: "profile", icon: User, label: t.account.profile },
    { id: "saved", icon: Bookmark, label: locale === "fr" ? "Enregistrés" : "Saved" },
    { id: "settings", icon: Settings, label: locale === "fr" ? "Réglages" : "Settings" },
  ];
  const orderCount = orderData?.orders?.length || 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 lg:px-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-terre/15 text-xl font-bold text-terre">
          {customer.firstName[0]}{customer.lastName[0]}
        </div>
        <div>
          <h1 className="text-xl font-bold text-charcoal">{customer.firstName} {customer.lastName}</h1>
          <p className="text-xs text-muted-foreground">{customer.email}</p>
        </div>
      </div>

      <div>
        <nav className="-mx-4 grid grid-cols-3 gap-1 border-y border-border bg-white px-4 py-2" aria-label={locale === "fr" ? "Rubriques du compte" : "Account sections"}>
          {nav.map((n) => (
            <button key={n.id} onClick={() => setSection(n.id)} aria-current={section === n.id ? "page" : undefined} className={`flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-bold transition ${section === n.id ? "bg-charcoal text-white" : "text-charcoal hover:bg-muted"}`}>
              <n.icon className="h-4 w-4 shrink-0" /> <span className="truncate">{n.label}</span>
            </button>
          ))}
        </nav>

        <div className="py-5">
          {section === "profile" && (
            <div className="space-y-3">
              <div><p className="text-[10px] font-extrabold uppercase text-terre">{locale === "fr" ? "Identité et avantages" : "Identity and benefits"}</p><h2 className="mt-1 text-lg font-black text-charcoal">{locale === "fr" ? "Mon profil" : "My profile"}</h2></div>
              <div className="grid grid-cols-2 gap-3">
                <FieldReadonly label={t.checkout.firstName} value={customer.firstName} />
                <FieldReadonly label={t.checkout.lastName} value={customer.lastName} />
                <FieldReadonly label={t.checkout.email} value={customer.email} />
                <FieldReadonly label={locale === "fr" ? "Téléphone" : "Phone"} value={customer.phone || "—"} />
              </div>
              <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-border bg-white">
                <Stat label={t.account.loyalty} value={`${customer.loyaltyPoints} pts`} icon={Star} color="#F2A900" />
                <Stat label={t.account.wallet} value={formatPrice(customer.walletCredit, locale)} icon={Wallet} color="#3F681C" />
                <Stat label={t.account.orders} value={String(orderCount)} icon={Package} color="#D65A32" />
              </div>
              <Button type="button" variant="outline" onClick={() => navigate("orders")} className="w-full sm:w-auto"><Package className="mr-2 h-4 w-4" /> {locale === "fr" ? "Voir mes commandes" : "View my orders"}</Button>
            </div>
          )}
          {section === "saved" && <div className="space-y-4"><div><p className="text-[10px] font-extrabold uppercase text-terre">{locale === "fr" ? "Ma sélection" : "My selection"}</p><h2 className="mt-1 text-lg font-black text-charcoal">{locale === "fr" ? "Éléments enregistrés" : "Saved items"}</h2></div><div className="inline-flex rounded-lg border border-border bg-white p-1" role="tablist" aria-label={locale === "fr" ? "Type d'éléments enregistrés" : "Saved item type"}><button type="button" role="tab" aria-selected={savedTab === "products"} onClick={() => setSavedTab("products")} className={`h-9 rounded-md px-3 text-xs font-bold ${savedTab === "products" ? "bg-charcoal text-white" : "text-muted-foreground"}`}>{t.account.favorites} <span className="ml-1 opacity-60">{favorites.length}</span></button><button type="button" role="tab" aria-selected={savedTab === "recipes"} onClick={() => setSavedTab("recipes")} className={`h-9 rounded-md px-3 text-xs font-bold ${savedTab === "recipes" ? "bg-charcoal text-white" : "text-muted-foreground"}`}>{t.account.savedRecipes} <span className="ml-1 opacity-60">{savedRecipes.length}</span></button></div>{savedTab === "products" ? <FavoritesSection locale={locale} favorites={favorites} /> : <SavedRecipesSection locale={locale} savedRecipes={savedRecipes} />}</div>}
          {section === "settings" && (
            <div className="space-y-6">
              <div><p className="text-[10px] font-extrabold uppercase text-terre">{locale === "fr" ? "Préférences et sécurité" : "Preferences and security"}</p><h2 className="mt-1 text-lg font-black text-charcoal">{locale === "fr" ? "Réglages du compte" : "Account settings"}</h2></div>
              <section className="border-y border-border py-4"><h3 className="text-sm font-extrabold text-charcoal">{t.account.language}</h3><p className="mt-1 text-xs text-muted-foreground">{locale === "fr" ? "Langue utilisée dans l'application et les contenus." : "Language used in the application and content."}</p><div className="mt-3 inline-flex rounded-lg bg-muted p-1">{(["fr", "en"] as const).map((l) => <button key={l} onClick={() => setLocale(l)} className={`h-9 rounded-md px-4 text-xs font-bold ${locale === l ? "bg-white text-charcoal shadow-sm" : "text-muted-foreground"}`}>{l === "fr" ? "Français" : "English"}</button>)}</div></section>
              <section className="border-b border-border pb-5"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-forest/10 text-forest"><ShieldCheck className="h-4 w-4" /></span><div><h3 className="text-sm font-extrabold text-charcoal">{locale === "fr" ? "Mot de passe" : "Password"}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{locale === "fr" ? "Recevez un lien sécurisé pour choisir un nouveau mot de passe." : "Receive a secure link to choose a new password."}</p></div></div><Button type="button" variant="outline" size="sm" onClick={() => void requestPasswordChange()} disabled={securityStatus === "busy" || securityStatus === "success"} className="mt-3">{securityStatus === "busy" ? (locale === "fr" ? "Envoi..." : "Sending...") : (locale === "fr" ? "Envoyer le lien" : "Send link")}</Button>{securityMessage ? <p role={securityStatus === "error" ? "alert" : "status"} className={`mt-3 text-xs ${securityStatus === "error" ? "text-destructive" : "text-forest"}`}>{securityMessage}</p> : null}</section>
              <section><h3 className="text-sm font-extrabold text-charcoal">{locale === "fr" ? "Fermer la session" : "Close session"}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{locale === "fr" ? "Votre panier restera sur cet appareil après la déconnexion." : "Your cart will stay on this device after sign-out."}</p><LogoutConfirmDialog><Button type="button" variant="outline" className="mt-3 border-destructive/25 text-destructive hover:bg-destructive/5 hover:text-destructive"><LogOut className="mr-2 h-4 w-4" /> {t.account.logout}</Button></LogoutConfirmDialog></section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
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

function FieldReadonly({ label, value }: { label: string; value: string }) {
  return <div><Label className="mb-1 block text-xs font-semibold text-charcoal">{label}</Label><Input value={value} readOnly className="bg-muted/40" /></div>;
}
function Stat({ label, value, icon: Icon, color }: any) {
  return (
    <div className="min-w-0 border-r border-border p-3 last:border-r-0">
      <Icon className="h-4 w-4" style={{ color }} />
      <p className="mt-2 truncate text-sm font-black text-charcoal">{value}</p>
      <p className="mt-0.5 truncate text-[9px] text-muted-foreground sm:text-[10px]">{label}</p>
    </div>
  );
}
function EmptyFeature({ icon: Icon, title, description, actionLabel, onAction }: { icon: LucideIcon; title: string; description: string; actionLabel: string; onAction: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <Icon className="h-10 w-10 text-muted-foreground/40" />
      <p className="text-sm font-medium text-charcoal">{title}</p>
      <p className="max-w-sm text-xs leading-5 text-muted-foreground">{description}</p>
      <Button type="button" variant="outline" size="sm" onClick={onAction} className="mt-1">{actionLabel}</Button>
    </div>
  );
}

function FavoritesSection({ locale, favorites }: { locale: string; favorites: string[] }) {
  const t = dict[locale as "fr" | "en"];
  const navigate = useStore((state) => state.navigate);
  // fetch a few products — use catalog all then filter; simpler: fetch each (small)
  const { data } = useFetch(`/api/catalog?locale=${locale}&pageSize=100`, []);
  const products = (data?.products || []).filter((p: any) => favorites.includes(p.id));
  if (products.length === 0) return <EmptyFeature icon={Heart} title={t.account.favorites} description={locale === "fr" ? "Ajoutez des produits depuis le catalogue pour les retrouver ici." : "Save products from the catalogue to find them here."} actionLabel={locale === "fr" ? "Parcourir le catalogue" : "Browse catalogue"} onAction={() => navigate("catalog")} />;
  return (
    <div>
      <h2 className="mb-3 text-lg font-bold text-charcoal">{t.account.favorites} ({products.length})</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{products.map((p: any, i: number) => <ProductCard key={p.id} product={p} index={i} />)}</div>
    </div>
  );
}
function SavedRecipesSection({ locale, savedRecipes }: { locale: string; savedRecipes: string[] }) {
  const t = dict[locale as "fr" | "en"];
  const navigate = useStore((state) => state.navigate);
  const { data } = useFetch(`/api/recipes?locale=${locale}`, []);
  const recipes = (data?.recipes || []).filter((r: any) => savedRecipes.includes(r.id));
  if (recipes.length === 0) return <EmptyFeature icon={ChefHat} title={t.account.savedRecipes} description={locale === "fr" ? "Enregistrez une recette pour la retrouver rapidement et préparer son panier." : "Save a recipe to find it quickly and prepare its basket."} actionLabel={locale === "fr" ? "Découvrir les recettes" : "Discover recipes"} onAction={() => navigate("recipes")} />;
  return (
    <div>
      <h2 className="mb-3 text-lg font-bold text-charcoal">{t.account.savedRecipes} ({recipes.length})</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{recipes.map((r: any, i: number) => <RecipeCard key={r.id} recipe={r} index={i} />)}</div>
    </div>
  );
}
