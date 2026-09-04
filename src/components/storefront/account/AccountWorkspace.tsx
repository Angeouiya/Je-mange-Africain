"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AtSign,
  ArrowUpDown,
  Bookmark,
  BriefcaseBusiness,
  Check,
  ChefHat,
  Cloud,
  CloudOff,
  Heart,
  Home,
  Languages,
  Loader2,
  LockKeyhole,
  LogOut,
  MapPin,
  MapPinCheck,
  Package,
  Pencil,
  Phone,
  Plus,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Star,
  Trash2,
  User,
  Wallet,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProductCard, type ProductListItem } from "@/components/shared/ProductCard";
import { RecipeCard, type RecipeListItem } from "@/components/shared/RecipeCard";
import { LogoutConfirmDialog } from "@/components/storefront/LogoutConfirmDialog";
import { dict } from "@/lib/i18n";
import { formatPrice } from "@/lib/format";
import { useStore, type Address } from "@/lib/store";
import { useFetch } from "@/lib/use-fetch";
import { BRAND_COLORS, getBrandAccentForeground } from "@/lib/brand-colors";

type AccountSection = "profile" | "addresses" | "saved" | "settings";
type RequestStatus = "idle" | "busy" | "success" | "error";

type AccountResponse = {
  customer: NonNullable<ReturnType<typeof useStore.getState>["customer"]>;
  addresses: Address[];
  favoriteProductIds?: string[];
  savedRecipeIds?: string[];
};

const countries = ["France", "Belgique", "Allemagne", "Pays-Bas", "Luxembourg"];

export function AccountWorkspace() {
  const locale = useStore((state) => state.locale);
  const customer = useStore((state) => state.customer)!;
  const favorites = useStore((state) => state.favorites);
  const savedRecipes = useStore((state) => state.savedRecipes);
  const addresses = useStore((state) => state.addresses);
  const setAddresses = useStore((state) => state.setAddresses);
  const setCustomer = useStore((state) => state.setCustomer);
  const mergeSavedItems = useStore((state) => state.mergeSavedItems);
  const setLocale = useStore((state) => state.setLocale);
  const navigate = useStore((state) => state.navigate);
  const params = useStore((state) => state.params);
  const t = dict[locale];
  const [section, setSection] = useState<AccountSection>(params.accountSection || "profile");
  const [savedTab, setSavedTab] = useState<"products" | "recipes">("products");
  const [profile, setProfile] = useState({ firstName: customer.firstName, lastName: customer.lastName, phone: customer.phone });
  const [profileStatus, setProfileStatus] = useState<RequestStatus>("idle");
  const [profileMessage, setProfileMessage] = useState("");
  const [securityStatus, setSecurityStatus] = useState<RequestStatus>("idle");
  const [securityMessage, setSecurityMessage] = useState("");
  const [addressOpen, setAddressOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState(() => blankAddress(customer));
  const [addressStatus, setAddressStatus] = useState<RequestStatus>("idle");
  const [addressMessage, setAddressMessage] = useState("");
  const contentRef = useRef<HTMLElement>(null);
  const { data: accountData, loading: accountLoading } = useFetch<AccountResponse>(`/api/customer/account`, [customer.id]);
  const { data: orderData } = useFetch(customer ? `/api/orders?locale=${locale}` : null, [customer.id, locale]);

  useEffect(() => {
    if (!params.accountSection) return;
    setSection(params.accountSection);
  }, [params.accountSection]);

  useEffect(() => {
    if (!accountData?.customer) return;
    setCustomer(accountData.customer);
    setAddresses(accountData.addresses || []);
    mergeSavedItems(accountData.favoriteProductIds || [], accountData.savedRecipeIds || []);
  }, [accountData, mergeSavedItems, setAddresses, setCustomer]);

  useEffect(() => {
    setProfile({ firstName: customer.firstName, lastName: customer.lastName, phone: customer.phone });
  }, [customer.firstName, customer.lastName, customer.phone]);

  const nav: Array<{ id: AccountSection; icon: LucideIcon; label: string; shortLabel: string; purpose: string; accent: string }> = [
    { id: "profile", icon: User, label: t.account.profile, shortLabel: locale === "fr" ? "Profil" : "Profile", purpose: locale === "fr" ? "Identité et avantages" : "Identity and benefits", accent: BRAND_COLORS.earth },
    { id: "addresses", icon: MapPin, label: t.account.addresses, shortLabel: locale === "fr" ? "Adresses" : "Addresses", purpose: locale === "fr" ? "Priorité de livraison" : "Delivery priority", accent: BRAND_COLORS.burgundy },
    { id: "saved", icon: Bookmark, label: locale === "fr" ? "Enregistrés" : "Saved", shortLabel: locale === "fr" ? "Favoris" : "Saved", purpose: locale === "fr" ? "Produits et recettes" : "Products and recipes", accent: BRAND_COLORS.terracotta },
    { id: "settings", icon: Settings, label: locale === "fr" ? "Réglages" : "Settings", shortLabel: locale === "fr" ? "Réglages" : "Settings", purpose: locale === "fr" ? "Langue et sécurité" : "Language and security", accent: BRAND_COLORS.gold },
  ];
  const orderCount = orderData?.orders?.length || 0;
  const defaultAddress = useMemo(() => addresses.find((address) => address.isDefault) || addresses[0], [addresses]);
  const profileDirty = profile.firstName !== customer.firstName || profile.lastName !== customer.lastName || profile.phone !== customer.phone;

  const selectSection = (nextSection: AccountSection) => {
    setSection(nextSection);
    navigate("account", { accountSection: nextSection });
    if (window.matchMedia("(max-width: 767px)").matches) {
      const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
      requestAnimationFrame(() => contentRef.current?.scrollIntoView({ behavior, block: "start" }));
    }
  };

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!profileDirty) return;
    setProfileStatus("busy");
    setProfileMessage("");
    try {
      const response = await requestJSON<AccountResponse>("/api/customer/account", "PATCH", { ...profile, preferredLang: locale });
      setCustomer(response.customer);
      setAddresses(response.addresses || []);
      setProfileStatus("success");
      setProfileMessage(locale === "fr" ? "Vos coordonnées sont à jour." : "Your contact details are up to date.");
    } catch (error) {
      setProfileStatus("error");
      setProfileMessage(error instanceof Error ? error.message : (locale === "fr" ? "Modification impossible." : "Unable to update your profile."));
    }
  };

  const updateProfile = (field: keyof typeof profile, value: string) => {
    setProfile((current) => ({ ...current, [field]: value }));
    if (profileStatus !== "busy") {
      setProfileStatus("idle");
      setProfileMessage("");
    }
  };

  const openAddressEditor = (address?: Address) => {
    setEditingAddressId(address?.id || null);
    setAddressForm(address ? { ...address, phone: address.phone || "", isDefault: Boolean(address.isDefault) } : blankAddress(customer, addresses.length === 0));
    setAddressStatus("idle");
    setAddressMessage("");
    setAddressOpen(true);
  };

  const saveAddress = async (event: FormEvent) => {
    event.preventDefault();
    setAddressStatus("busy");
    setAddressMessage("");
    try {
      const endpoint = editingAddressId ? `/api/customer/account/addresses/${editingAddressId}` : "/api/customer/account/addresses";
      const response = await requestJSON<AccountResponse>(endpoint, editingAddressId ? "PATCH" : "POST", { ...addressForm, locale });
      setAddresses(response.addresses || []);
      setAddressStatus("success");
      setAddressOpen(false);
    } catch (error) {
      setAddressStatus("error");
      setAddressMessage(error instanceof Error ? error.message : (locale === "fr" ? "Enregistrement impossible." : "Unable to save the address."));
    }
  };

  const deleteAddress = async (addressId: string) => {
    setAddressStatus("busy");
    setAddressMessage("");
    try {
      const response = await requestJSON<AccountResponse>(`/api/customer/account/addresses/${addressId}?locale=${locale}`, "DELETE");
      setAddresses(response.addresses || []);
      setAddressStatus("success");
    } catch (error) {
      setAddressStatus("error");
      setAddressMessage(error instanceof Error ? error.message : (locale === "fr" ? "Suppression impossible." : "Unable to delete the address."));
    }
  };

  const makeDefault = async (address: Address) => {
    setAddressStatus("busy");
    setAddressMessage("");
    try {
      const response = await requestJSON<AccountResponse>(`/api/customer/account/addresses/${address.id}`, "PATCH", { ...address, phone: address.phone || customer.phone, isDefault: true, locale });
      setAddresses(response.addresses || []);
      setAddressStatus("success");
    } catch (error) {
      setAddressStatus("error");
      setAddressMessage(error instanceof Error ? error.message : (locale === "fr" ? "Modification impossible." : "Unable to update the address."));
    }
  };

  const requestPasswordChange = async () => {
    if (securityStatus === "busy") return;
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

  const changeLanguage = async (nextLocale: "fr" | "en") => {
    setLocale(nextLocale);
    try {
      const response = await requestJSON<AccountResponse>("/api/customer/account", "PATCH", { preferredLang: nextLocale });
      setCustomer(response.customer);
    } catch {
      // The local preference remains usable if remote synchronization is temporarily unavailable.
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-7 md:py-9 lg:px-8">
      <header className="relative -mx-4 overflow-hidden border-y border-burgundy/12 bg-[#FFF8F4] bg-[linear-gradient(112deg,#FFF8F4_0%,#FFFCFA_56%,#FFFFFF_100%)] px-4 pb-0 pt-5 text-charcoal md:-mx-7 md:px-7 lg:-mx-8 lg:px-8" data-testid="account-identity-header">
        <div className="absolute inset-x-0 top-0 h-[3px] african-kente-stripe" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-md border border-white/70 bg-[linear-gradient(145deg,#D65A32,#B9472B_58%,#8A3042)] text-lg font-black text-white shadow-[0_16px_34px_-21px_rgba(138,48,66,0.72)]">{initials(customer.firstName, customer.lastName)}</span>
            <div className="min-w-0"><p className="text-[10px] font-extrabold uppercase text-terre">{locale === "fr" ? "Espace personnel" : "Personal space"}</p><h1 className="mt-1 truncate font-display text-2xl font-semibold sm:text-3xl">{customer.firstName} {customer.lastName}</h1><p className="mt-1 truncate text-xs text-muted-foreground">{customer.email}</p></div>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-md border border-burgundy/16 bg-white px-3 py-2 text-[11px] font-bold text-burgundy"><ShieldCheck className="h-4 w-4 text-terre" />{locale === "fr" ? "Compte protégé" : "Protected account"}</span>
        </div>
        <div className="mt-5 grid grid-cols-3 divide-x divide-burgundy/10 border-t border-burgundy/10" data-testid="account-command-summary">
          <AccountSummaryFact icon={Star} label={t.account.loyalty} value={`${customer.loyaltyPoints} pts`} />
          <AccountSummaryFact icon={Package} label={t.account.orders} value={String(orderCount)} />
          <AccountSummaryFact icon={MapPin} label={t.account.addresses} value={String(addresses.length)} />
        </div>
      </header>

      <nav className="sticky top-[6.65rem] z-30 -mx-4 mt-4 grid grid-cols-4 gap-1 border-y border-border bg-white/[0.97] px-4 py-2 shadow-[0_14px_30px_-30px_rgba(90,38,50,0.72)] backdrop-blur-xl md:top-[4.4rem] md:-mx-7 md:px-7 lg:-mx-8 lg:px-8" aria-label={locale === "fr" ? "Rubriques du compte" : "Account sections"} data-testid="account-section-navigation">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = section === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => selectSection(item.id)}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              data-active={active ? "true" : "false"}
              className={`group relative flex min-h-12 min-w-0 items-center justify-center gap-1.5 overflow-hidden rounded-md border px-1 text-[9px] font-extrabold transition sm:justify-start sm:gap-2 sm:px-2 sm:text-xs ${active ? "border-burgundy/12 bg-[linear-gradient(118deg,rgba(255,255,255,1),rgba(185,71,43,0.07))] text-charcoal shadow-[0_10px_24px_-20px_rgba(90,38,50,0.8)]" : "border-transparent text-muted-foreground hover:bg-burgundy/[0.04] hover:text-charcoal"}`}
            >
              {active ? <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-t-full" style={{ backgroundColor: item.accent }} aria-hidden="true" /> : null}
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md transition-transform duration-200 group-hover:scale-[1.04]" style={{ backgroundColor: active ? item.accent : `${item.accent}14`, color: active ? getBrandAccentForeground(item.accent) : item.accent }}><Icon className="h-4 w-4" /></span>
              <span className="min-w-0 text-left"><span className="block sm:hidden">{item.shortLabel}</span><span className="hidden sm:block">{item.label}</span><span className="mt-0.5 hidden text-[8px] font-semibold leading-none text-muted-foreground lg:block">{item.purpose}</span></span>
              {item.id === "addresses" && addresses.length ? <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[8px] font-black text-charcoal">{addresses.length}</span> : null}
            </button>
          );
        })}
      </nav>

      <main ref={contentRef} className="scroll-mt-32 py-6">
        {section === "profile" ? (
          <section aria-labelledby="account-profile-title">
            <SectionHeading eyebrow={locale === "fr" ? "Identité et avantages" : "Identity and benefits"} title={locale === "fr" ? "Mon profil" : "My profile"} description={locale === "fr" ? "Les coordonnées utilisées pour votre compte, vos factures et le suivi de livraison." : "Contact details used for your account, invoices and delivery tracking."} id="account-profile-title" />
            <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
                <TextField id="profile-first-name" label={t.checkout.firstName} value={profile.firstName} onChange={(value) => updateProfile("firstName", value)} autoComplete="given-name" required />
                <TextField id="profile-last-name" label={t.checkout.lastName} value={profile.lastName} onChange={(value) => updateProfile("lastName", value)} autoComplete="family-name" required />
                <div><Label htmlFor="profile-email" className="mb-1.5 block text-xs font-bold text-charcoal">{t.checkout.email}</Label><div className="relative"><AtSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="profile-email" value={customer.email} readOnly className="bg-muted/45 pl-9" /></div><p className="mt-1 text-[10px] text-muted-foreground">{locale === "fr" ? "Identifiant principal sécurisé" : "Secure primary identifier"}</p></div>
                <div><Label htmlFor="profile-phone" className="mb-1.5 block text-xs font-bold text-charcoal">{locale === "fr" ? "Téléphone" : "Phone"}</Label><div className="relative"><Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="profile-phone" type="tel" autoComplete="tel" value={profile.phone} onChange={(event) => updateProfile("phone", event.target.value)} className="pl-9" required /></div></div>
                <InlineStatus status={profileStatus} message={profileMessage} className="sm:col-span-2" />
                <div className="sm:col-span-2"><Button type="submit" disabled={profileStatus === "busy" || !profileDirty} className="w-full bg-terre text-white hover:bg-terre-dark sm:w-auto">{profileDirty ? <Save className="mr-2 h-4 w-4" /> : <Check className="mr-2 h-4 w-4" />}{profileStatus === "busy" ? (locale === "fr" ? "Enregistrement..." : "Saving...") : profileDirty ? (locale === "fr" ? "Enregistrer mes coordonnées" : "Save my details") : (locale === "fr" ? "Coordonnées à jour" : "Details up to date")}</Button></div>
              </form>

              <aside className="border-y border-border py-1">
                <StatRow icon={Star} color="#F2A900" label={t.account.loyalty} value={`${customer.loyaltyPoints} pts`} />
                <StatRow icon={Wallet} color="#8A3042" label={t.account.wallet} value={formatPrice(customer.walletCredit, locale)} />
                <StatRow icon={Package} color="#D65A32" label={t.account.orders} value={String(orderCount)} />
                <div className="py-4"><Button type="button" variant="outline" onClick={() => navigate("orders")} className="w-full"><Package className="mr-2 h-4 w-4" />{locale === "fr" ? "Voir mes commandes" : "View my orders"}</Button></div>
              </aside>
            </div>
          </section>
        ) : null}

        {section === "addresses" ? (
          <section aria-labelledby="account-addresses-title">
            <div className="flex items-start justify-between gap-4"><SectionHeading eyebrow={locale === "fr" ? "Livraison internationale" : "International delivery"} title={t.account.addresses} description={locale === "fr" ? "Choisissez l'adresse proposée en priorité lors du paiement." : "Choose the address suggested first during checkout."} id="account-addresses-title" /><Button type="button" onClick={() => openAddressEditor()} className="shrink-0 bg-terre text-white hover:bg-terre-dark"><Plus className="mr-1.5 h-4 w-4" /><span className="hidden sm:inline">{locale === "fr" ? "Ajouter une adresse" : "Add address"}</span><span className="sm:hidden">{locale === "fr" ? "Ajouter" : "Add"}</span></Button></div>
            {addressMessage ? <InlineStatus status={addressStatus} message={addressMessage} className="mt-4" /> : null}
            {accountLoading && addresses.length === 0 ? <div role="status" className="mt-8 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{locale === "fr" ? "Chargement du carnet..." : "Loading address book..."}</div> : addresses.length ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {addresses.map((address) => <AddressCard key={address.id} address={address} locale={locale} busy={addressStatus === "busy"} onEdit={() => openAddressEditor(address)} onDefault={() => void makeDefault(address)} onDelete={() => void deleteAddress(address.id)} />)}
              </div>
            ) : (
              <div className="mt-7 border-y border-border py-10 text-center"><span className="mx-auto grid h-11 w-11 place-items-center rounded-lg bg-terre/10 text-terre"><MapPin className="h-5 w-5" /></span><h3 className="mt-3 text-sm font-black text-charcoal">{locale === "fr" ? "Votre carnet est vide" : "Your address book is empty"}</h3><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-muted-foreground">{locale === "fr" ? "Ajoutez une adresse complète pour accélérer le paiement et fiabiliser la livraison." : "Add a complete address to speed up checkout and make delivery more reliable."}</p><Button type="button" variant="outline" size="sm" onClick={() => openAddressEditor()} className="mt-4"><Plus className="mr-1.5 h-4 w-4" />{locale === "fr" ? "Créer ma première adresse" : "Create my first address"}</Button></div>
            )}
            {defaultAddress ? <div className="mt-5 flex items-start gap-3 rounded-lg border border-burgundy/18 bg-burgundy/[0.045] p-4"><MapPinCheck className="mt-0.5 h-5 w-5 shrink-0 text-burgundy" /><div><p className="text-xs font-black text-charcoal">{locale === "fr" ? "Adresse proposée au paiement" : "Address suggested at checkout"}</p><p className="mt-1 text-[11px] text-muted-foreground">{defaultAddress.label} · {defaultAddress.postalCode} {defaultAddress.city}, {defaultAddress.country}</p></div></div> : null}
          </section>
        ) : null}

        {section === "saved" ? <SavedSection locale={locale} savedTab={savedTab} setSavedTab={setSavedTab} favorites={favorites} savedRecipes={savedRecipes} /> : null}

        {section === "settings" ? (
          <section aria-labelledby="account-settings-title">
            <SectionHeading eyebrow={locale === "fr" ? "Préférences et sécurité" : "Preferences and security"} title={locale === "fr" ? "Réglages du compte" : "Account settings"} description={locale === "fr" ? "Une configuration simple, synchronisée avec votre compte." : "A simple configuration synchronized with your account."} id="account-settings-title" />
            <div className="mt-6 divide-y divide-border border-y border-border">
              <SettingRow icon={Languages} accent={BRAND_COLORS.gold} title={t.account.language} description={locale === "fr" ? "Langue utilisée dans l'application et les contenus." : "Language used in the application and content."}><div className="inline-flex rounded-lg bg-muted p-1">{(["fr", "en"] as const).map((language) => <button key={language} type="button" onClick={() => void changeLanguage(language)} aria-pressed={locale === language} className={`h-9 rounded-md px-4 text-xs font-bold ${locale === language ? "bg-white text-charcoal shadow-sm" : "text-muted-foreground"}`}>{language === "fr" ? "Français" : "English"}</button>)}</div></SettingRow>
              <SettingRow icon={LockKeyhole} accent={BRAND_COLORS.burgundy} title={locale === "fr" ? "Mot de passe" : "Password"} description={locale === "fr" ? "Recevez un lien sécurisé pour choisir un nouveau mot de passe." : "Receive a secure link to choose a new password."}><Button type="button" variant="outline" size="sm" onClick={() => void requestPasswordChange()} disabled={securityStatus === "busy" || securityStatus === "success"}>{securityStatus === "busy" ? (locale === "fr" ? "Envoi..." : "Sending...") : (locale === "fr" ? "Envoyer le lien" : "Send link")}</Button><InlineStatus status={securityStatus} message={securityMessage} className="mt-3" /></SettingRow>
              <SettingRow icon={LogOut} accent={BRAND_COLORS.chilli} title={locale === "fr" ? "Fermer la session" : "Close session"} description={locale === "fr" ? "Votre panier restera sur cet appareil après la déconnexion." : "Your cart will stay on this device after sign-out."}><LogoutConfirmDialog><Button type="button" variant="outline" className="border-destructive/25 text-destructive hover:bg-destructive/5 hover:text-destructive"><LogOut className="mr-2 h-4 w-4" />{t.account.logout}</Button></LogoutConfirmDialog></SettingRow>
            </div>
          </section>
        ) : null}
      </main>

      <AddressEditor open={addressOpen} onOpenChange={setAddressOpen} locale={locale} address={addressForm} setAddress={setAddressForm} editing={Boolean(editingAddressId)} status={addressStatus} message={addressMessage} onSubmit={saveAddress} />
    </div>
  );
}

function SectionHeading({ eyebrow, title, description, id }: { eyebrow: string; title: string; description: string; id: string }) {
  return <div className="min-w-0"><p className="jma-eyebrow">{eyebrow}</p><h2 id={id} className="jma-section-title mt-1">{title}</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground sm:text-sm">{description}</p></div>;
}

function AccountSummaryFact({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return <div className="min-w-0 px-3 py-3 first:pl-0 last:pr-0 sm:px-5 sm:py-4"><p className="flex items-center gap-1.5 text-[8px] font-black uppercase text-muted-foreground sm:text-[9px]"><Icon className="h-3.5 w-3.5 shrink-0 text-terre" /> <span className="truncate">{label}</span></p><p className="mt-1 truncate text-xs font-black text-charcoal sm:text-sm">{value}</p></div>;
}

function TextField({ id, label, value, onChange, autoComplete, required }: { id: string; label: string; value: string; onChange: (value: string) => void; autoComplete?: string; required?: boolean }) {
  return <div><Label htmlFor={id} className="mb-1.5 block text-xs font-bold text-charcoal">{label}</Label><Input id={id} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} required={required} /></div>;
}

function StatRow({ icon: Icon, color, label, value }: { icon: LucideIcon; color: string; label: string; value: string }) {
  return <div className="flex items-center gap-3 border-b border-border py-4 last:border-b-0"><span className="grid h-9 w-9 place-items-center rounded-md" style={{ backgroundColor: `${color}14`, color }}><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1 truncate text-xs font-bold text-muted-foreground">{label}</span><strong className="shrink-0 text-sm font-black text-charcoal">{value}</strong></div>;
}

function AddressCard({ address, locale, busy, onEdit, onDefault, onDelete }: { address: Address; locale: "fr" | "en"; busy: boolean; onEdit: () => void; onDefault: () => void; onDelete: () => void }) {
  const HomeIcon = /domicile|home/i.test(address.label) ? Home : BriefcaseBusiness;
  return (
    <article className={`relative rounded-lg border bg-white p-4 ${address.isDefault ? "border-burgundy/30 shadow-[inset_3px_0_0_#8A3042]" : "border-border"}`}>
      <div className="flex items-start gap-3"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-md ${address.isDefault ? "bg-burgundy/10 text-burgundy" : "bg-muted text-charcoal"}`}><HomeIcon className="h-[1.125rem] w-[1.125rem]" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-black text-charcoal">{address.label}</h3>{address.isDefault ? <span className="rounded bg-burgundy/10 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-burgundy">{locale === "fr" ? "Par défaut" : "Default"}</span> : null}</div><p className="mt-2 text-xs font-bold text-charcoal">{address.firstName} {address.lastName}</p><p className="mt-1 text-[11px] leading-5 text-muted-foreground">{address.street}<br />{address.postalCode} {address.city}<br />{address.country}{address.phone ? <><br />{address.phone}</> : null}</p></div></div>
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">{address.isDefault ? <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-burgundy"><Check className="h-3.5 w-3.5" />{locale === "fr" ? "Prioritaire" : "Priority"}</span> : <button type="button" onClick={onDefault} disabled={busy} className="min-h-8 text-left text-[10px] font-bold text-terre hover:underline disabled:opacity-50">{locale === "fr" ? "Définir par défaut" : "Make default"}</button>}<div className="flex gap-1"><button type="button" onClick={onEdit} disabled={busy} aria-label={locale === "fr" ? `Modifier l'adresse ${address.label}` : `Edit ${address.label} address`} title={locale === "fr" ? "Modifier" : "Edit"} className="grid h-9 w-9 place-items-center rounded-md border border-border text-muted-foreground hover:border-terre/35 hover:text-terre disabled:opacity-50"><Pencil className="h-4 w-4" /></button><AlertDialog><AlertDialogTrigger asChild><button type="button" disabled={busy} aria-label={locale === "fr" ? `Supprimer l'adresse ${address.label}` : `Delete ${address.label} address`} title={locale === "fr" ? "Supprimer" : "Delete"} className="grid h-9 w-9 place-items-center rounded-md border border-border text-muted-foreground hover:border-destructive/30 hover:text-destructive disabled:opacity-50"><Trash2 className="h-4 w-4" /></button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><span className="mb-1 grid h-11 w-11 place-items-center rounded-md bg-destructive/[0.07] text-destructive"><Trash2 className="h-5 w-5" /></span><AlertDialogTitle>{locale === "fr" ? "Supprimer cette adresse ?" : "Delete this address?"}</AlertDialogTitle><AlertDialogDescription>{locale === "fr" ? `L'adresse « ${address.label} » disparaîtra de votre carnet. Les commandes déjà passées conserveront leur adresse de livraison.` : `The “${address.label}” address will be removed from your address book. Existing orders keep their delivery address.`}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{locale === "fr" ? "Conserver" : "Keep"}</AlertDialogCancel><AlertDialogAction onClick={onDelete} className="bg-destructive text-white hover:bg-destructive/90"><Trash2 className="mr-2 h-4 w-4" />{locale === "fr" ? "Oui, supprimer" : "Yes, delete"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></div>
    </article>
  );
}

function AddressEditor({ open, onOpenChange, locale, address, setAddress, editing, status, message, onSubmit }: { open: boolean; onOpenChange: (open: boolean) => void; locale: "fr" | "en"; address: Omit<Address, "id">; setAddress: (address: Omit<Address, "id">) => void; editing: boolean; status: RequestStatus; message: string; onSubmit: (event: FormEvent) => void }) {
  return <Dialog open={open} onOpenChange={(next) => status !== "busy" && onOpenChange(next)}><DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto p-5 sm:max-w-xl sm:p-6"><DialogHeader><span className="grid h-11 w-11 place-items-center rounded-lg bg-terre/10 text-terre"><MapPin className="h-5 w-5" /></span><DialogTitle>{editing ? (locale === "fr" ? "Modifier l'adresse" : "Edit address") : (locale === "fr" ? "Nouvelle adresse" : "New address")}</DialogTitle><DialogDescription>{locale === "fr" ? "Ces informations seront proposées au paiement et utilisées par le transporteur." : "These details will be suggested at checkout and used by the carrier."}</DialogDescription></DialogHeader><form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2"><TextField id="address-label" label={locale === "fr" ? "Nom de l'adresse" : "Address name"} value={address.label} onChange={(value) => setAddress({ ...address, label: value })} autoComplete="off" required /><div className="hidden sm:block" /><TextField id="address-first-name" label={locale === "fr" ? "Prénom" : "First name"} value={address.firstName} onChange={(value) => setAddress({ ...address, firstName: value })} autoComplete="given-name" required /><TextField id="address-last-name" label={locale === "fr" ? "Nom" : "Last name"} value={address.lastName} onChange={(value) => setAddress({ ...address, lastName: value })} autoComplete="family-name" required /><div className="sm:col-span-2"><TextField id="address-street" label={locale === "fr" ? "Adresse complète" : "Street address"} value={address.street} onChange={(value) => setAddress({ ...address, street: value })} autoComplete="street-address" required /></div><TextField id="address-postal-code" label={locale === "fr" ? "Code postal" : "Postal code"} value={address.postalCode} onChange={(value) => setAddress({ ...address, postalCode: value })} autoComplete="postal-code" required /><TextField id="address-city" label={locale === "fr" ? "Ville" : "City"} value={address.city} onChange={(value) => setAddress({ ...address, city: value })} autoComplete="address-level2" required /><div><Label htmlFor="address-country" className="mb-1.5 block text-xs font-bold text-charcoal">{locale === "fr" ? "Pays" : "Country"}</Label><select id="address-country" value={address.country} onChange={(event) => setAddress({ ...address, country: event.target.value })} autoComplete="country-name" className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm text-charcoal outline-none focus:border-terre focus:ring-2 focus:ring-terre/20">{countries.map((country) => <option key={country} value={country}>{countryLabel(country, locale)}</option>)}</select></div><TextField id="address-phone" label={locale === "fr" ? "Téléphone du destinataire" : "Recipient phone"} value={address.phone || ""} onChange={(value) => setAddress({ ...address, phone: value })} autoComplete="tel" required /><label className="flex min-h-11 items-center gap-2.5 rounded-lg border border-border bg-muted/30 px-3 text-xs font-bold text-charcoal sm:col-span-2"><Checkbox checked={Boolean(address.isDefault)} onCheckedChange={(checked) => setAddress({ ...address, isDefault: checked === true })} />{locale === "fr" ? "Proposer cette adresse en priorité au paiement" : "Suggest this address first at checkout"}</label><InlineStatus status={status} message={message} className="sm:col-span-2" /><DialogFooter className="mt-2 sm:col-span-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={status === "busy"}>{locale === "fr" ? "Annuler" : "Cancel"}</Button><Button type="submit" disabled={status === "busy"} className="bg-terre text-white hover:bg-terre-dark">{status === "busy" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{editing ? (locale === "fr" ? "Enregistrer" : "Save") : (locale === "fr" ? "Ajouter au carnet" : "Add to address book")}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function SavedSection({ locale, savedTab, setSavedTab, favorites, savedRecipes }: { locale: "fr" | "en"; savedTab: "products" | "recipes"; setSavedTab: (tab: "products" | "recipes") => void; favorites: string[]; savedRecipes: string[] }) {
  const t = dict[locale];
  const navigate = useStore((state) => state.navigate);
  const savedSyncStatus = useStore((state) => state.savedSyncStatus);
  const syncSavedItems = useStore((state) => state.syncSavedItems);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"recent" | "name" | "country">("recent");
  const { data: catalogue, loading: productsLoading, error: productsError, refetch: refetchProducts } = useFetch<{ products: ProductListItem[] }>(`/api/catalog?locale=${locale}&pageSize=100`, [locale]);
  const { data: recipeData, loading: recipesLoading, error: recipesError, refetch: refetchRecipes } = useFetch<{ recipes: RecipeListItem[] }>(`/api/recipes?locale=${locale}`, [locale]);
  const normalizedQuery = query.trim().toLocaleLowerCase(locale);
  const products = useMemo(() => orderSavedItems(
    (catalogue?.products || []).filter((product) => favorites.includes(product.id) && savedItemMatches(product.name, product.traditionalName, product.country, normalizedQuery, locale)),
    favorites,
    sort,
    locale,
  ), [catalogue?.products, favorites, locale, normalizedQuery, sort]);
  const recipes = useMemo(() => orderSavedItems(
    (recipeData?.recipes || []).filter((recipe) => savedRecipes.includes(recipe.id) && savedItemMatches(recipe.title, recipe.country, recipe.category, normalizedQuery, locale)),
    savedRecipes,
    sort,
    locale,
  ), [locale, normalizedQuery, recipeData?.recipes, savedRecipes, sort]);
  const loading = savedTab === "products" ? productsLoading : recipesLoading;
  const error = savedTab === "products" ? productsError : recipesError;
  return (
    <section aria-labelledby="account-saved-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading
          eyebrow={locale === "fr" ? "Bibliothèque personnelle" : "Personal library"}
          title={locale === "fr" ? "Mes essentiels" : "My essentials"}
          description={locale === "fr" ? "Produits préférés et recettes à cuisiner, disponibles sur tous vos appareils." : "Favourite products and recipes to cook, available across your devices."}
          id="account-saved-title"
        />
        <SavedSyncIndicator locale={locale} status={savedSyncStatus} onRetry={() => void syncSavedItems()} />
      </div>

      <div className="mt-5 border-b border-border bg-white pb-4">
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1" role="tablist" aria-label={locale === "fr" ? "Type d'éléments enregistrés" : "Saved item type"}>
          <button id="saved-products-tab" type="button" role="tab" aria-controls="saved-products-panel" aria-selected={savedTab === "products"} onClick={() => setSavedTab("products")} className={`flex min-h-10 min-w-0 items-center justify-center gap-2 rounded-md px-2 text-xs font-bold transition ${savedTab === "products" ? "bg-white text-charcoal shadow-sm" : "text-muted-foreground hover:text-charcoal"}`}><Heart className={`h-4 w-4 shrink-0 ${savedTab === "products" ? "fill-terre text-terre" : ""}`} /><span className="truncate">{t.account.favorites}</span><span className="rounded bg-charcoal/5 px-1.5 py-0.5 text-[9px]">{favorites.length}</span></button>
          <button id="saved-recipes-tab" type="button" role="tab" aria-label={`${t.account.savedRecipes}, ${savedRecipes.length}`} aria-controls="saved-recipes-panel" aria-selected={savedTab === "recipes"} onClick={() => setSavedTab("recipes")} className={`flex min-h-10 min-w-0 items-center justify-center gap-2 rounded-md px-2 text-xs font-bold transition ${savedTab === "recipes" ? "bg-white text-charcoal shadow-sm" : "text-muted-foreground hover:text-charcoal"}`}><ChefHat className={`h-4 w-4 shrink-0 ${savedTab === "recipes" ? "text-burgundy" : ""}`} /><span className="sm:hidden">{locale === "fr" ? "Mes recettes" : "Recipes"}</span><span className="hidden truncate sm:inline">{t.account.savedRecipes}</span><span className="rounded bg-charcoal/5 px-1.5 py-0.5 text-[9px]">{savedRecipes.length}</span></button>
        </div>

        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_9.25rem] gap-2 sm:grid-cols-[minmax(0,1fr)_11rem]">
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} aria-label={savedTab === "products" ? (locale === "fr" ? "Rechercher dans mes produits favoris" : "Search favourite products") : (locale === "fr" ? "Rechercher dans mes recettes sauvegardées" : "Search saved recipes")} placeholder={savedTab === "products" ? (locale === "fr" ? "Rechercher un produit..." : "Search a product...") : (locale === "fr" ? "Rechercher une recette..." : "Search a recipe...")} className="pl-9 pr-10 text-xs placeholder:text-xs" />{query ? <button type="button" onClick={() => setQuery("")} aria-label={locale === "fr" ? "Effacer la recherche" : "Clear search"} className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-charcoal"><X className="h-4 w-4" /></button> : null}</div>
          <div className="relative"><ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} aria-label={locale === "fr" ? "Trier les éléments enregistrés" : "Sort saved items"} className="h-10 w-full rounded-md border border-input bg-white pl-9 pr-3 text-xs font-bold text-charcoal outline-none focus:border-terre focus:ring-2 focus:ring-terre/20"><option value="recent">{locale === "fr" ? "Ajout récent" : "Recently added"}</option><option value="name">{locale === "fr" ? "Nom A–Z" : "Name A–Z"}</option><option value="country">{locale === "fr" ? "Pays" : "Country"}</option></select></div>
        </div>
      </div>

      <div id={savedTab === "products" ? "saved-products-panel" : "saved-recipes-panel"} role="tabpanel" aria-labelledby={savedTab === "products" ? "saved-products-tab" : "saved-recipes-tab"}>
        {loading ? <div role="status" className="grid grid-cols-2 gap-3 py-5 sm:grid-cols-3 lg:grid-cols-4" aria-label={locale === "fr" ? "Chargement de la sélection" : "Loading saved items"}>{Array.from({ length: 4 }).map((_, index) => <div key={index} className="aspect-[3/4] animate-pulse rounded-lg bg-muted" />)}</div> : null}
        {!loading && error ? <div className="py-10 text-center"><CloudOff className="mx-auto h-8 w-8 text-destructive/70" /><h3 className="mt-3 text-sm font-black text-charcoal">{locale === "fr" ? "Sélection momentanément indisponible" : "Saved items temporarily unavailable"}</h3><Button type="button" variant="outline" size="sm" onClick={savedTab === "products" ? refetchProducts : refetchRecipes} className="mt-4">{locale === "fr" ? "Réessayer" : "Retry"}</Button></div> : null}
        {!loading && !error && savedTab === "products" && products.length ? <div className="grid grid-cols-2 gap-3 py-5 sm:grid-cols-3 lg:grid-cols-4">{products.map((product, index) => <ProductCard key={product.id} product={product} index={index} compact />)}</div> : null}
        {!loading && !error && savedTab === "recipes" && recipes.length ? <div className="grid gap-4 py-5 sm:grid-cols-2 lg:grid-cols-3">{recipes.map((recipe, index) => <RecipeCard key={recipe.id} recipe={recipe} index={index} />)}</div> : null}
        {!loading && !error && savedTab === "products" && !products.length ? <EmptyFeature icon={normalizedQuery ? Search : Heart} title={normalizedQuery ? (locale === "fr" ? "Aucun produit trouvé" : "No product found") : t.account.favorites} description={normalizedQuery ? (locale === "fr" ? "Essayez un autre nom, pays ou type de produit." : "Try another name, country or product type.") : (locale === "fr" ? "Ajoutez des produits depuis le catalogue pour les retrouver ici." : "Save products from the catalogue to find them here.")} actionLabel={normalizedQuery ? (locale === "fr" ? "Effacer la recherche" : "Clear search") : (locale === "fr" ? "Parcourir le catalogue" : "Browse catalogue")} onAction={normalizedQuery ? () => setQuery("") : () => navigate("catalog")} /> : null}
        {!loading && !error && savedTab === "recipes" && !recipes.length ? <EmptyFeature icon={normalizedQuery ? Search : ChefHat} title={normalizedQuery ? (locale === "fr" ? "Aucune recette trouvée" : "No recipe found") : t.account.savedRecipes} description={normalizedQuery ? (locale === "fr" ? "Essayez un autre nom, pays ou type de recette." : "Try another name, country or recipe type.") : (locale === "fr" ? "Sauvegardez une recette pour la retrouver rapidement et préparer son panier." : "Save a recipe to find it quickly and prepare its basket.")} actionLabel={normalizedQuery ? (locale === "fr" ? "Effacer la recherche" : "Clear search") : (locale === "fr" ? "Découvrir les recettes" : "Discover recipes")} onAction={normalizedQuery ? () => setQuery("") : () => navigate("recipes")} /> : null}
      </div>
    </section>
  );
}

function SavedSyncIndicator({ locale, status, onRetry }: { locale: "fr" | "en"; status: ReturnType<typeof useStore.getState>["savedSyncStatus"]; onRetry: () => void }) {
  if (status === "error") return <button type="button" onClick={onRetry} className="inline-flex min-h-9 w-fit items-center gap-2 rounded-md border border-destructive/20 bg-destructive/[0.06] px-3 text-[10px] font-bold text-destructive"><CloudOff className="h-3.5 w-3.5" />{locale === "fr" ? "Réessayer la synchronisation" : "Retry sync"}</button>;
  if (status === "syncing") return <span role="status" className="inline-flex min-h-9 w-fit items-center gap-2 rounded-md border border-border bg-white px-3 text-[10px] font-bold text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />{locale === "fr" ? "Synchronisation..." : "Syncing..."}</span>;
  if (status === "idle") return <span role="status" className="inline-flex min-h-9 w-fit items-center gap-2 rounded-md border border-border bg-white px-3 text-[10px] font-bold text-muted-foreground"><Cloud className="h-3.5 w-3.5" />{locale === "fr" ? "Préparation de la synchronisation" : "Preparing sync"}</span>;
  return <span role="status" className="inline-flex min-h-9 w-fit items-center gap-2 rounded-md border border-burgundy/20 bg-burgundy/[0.045] px-3 text-[10px] font-bold text-burgundy"><Cloud className="h-3.5 w-3.5" />{locale === "fr" ? "Synchronisé au compte" : "Synced to account"}</span>;
}

function savedItemMatches(primary: string | undefined, secondary: string | undefined, tertiary: string | undefined, query: string, locale: "fr" | "en") {
  if (!query) return true;
  return [primary, secondary, tertiary].some((value) => String(value || "").toLocaleLowerCase(locale).includes(query));
}

function orderSavedItems<T extends { id: string; country?: string; name?: string; title?: string }>(items: T[], ids: string[], sort: "recent" | "name" | "country", locale: "fr" | "en") {
  const rank = sort === "recent" ? new Map(ids.map((id, index) => [id, index])) : null;
  return [...items].sort((a, b) => {
    if (rank) return (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER);
    if (sort === "country") return String(a.country || "").localeCompare(String(b.country || ""), locale);
    return String(a.name || a.title || "").localeCompare(String(b.name || b.title || ""), locale);
  });
}

function SettingRow({ icon: Icon, accent, title, description, children }: { icon: LucideIcon; accent: string; title: string; description: string; children: React.ReactNode }) {
  return <div className="grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border" style={{ backgroundColor: `${accent}0F`, borderColor: `${accent}22`, color: accent }}><Icon className="h-4 w-4" /></span><div><h3 className="text-sm font-black text-charcoal">{title}</h3><p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">{description}</p></div></div><div>{children}</div></div>;
}

function EmptyFeature({ icon: Icon, title, description, actionLabel, onAction }: { icon: LucideIcon; title: string; description: string; actionLabel: string; onAction: () => void }) {
  return <div className="mt-6 border-y border-border py-10 text-center"><Icon className="mx-auto h-9 w-9 text-muted-foreground/40" /><h3 className="mt-3 text-sm font-black text-charcoal">{title}</h3><p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted-foreground">{description}</p><Button type="button" variant="outline" size="sm" onClick={onAction} className="mt-4">{actionLabel}</Button></div>;
}

function InlineStatus({ status, message, className = "" }: { status: RequestStatus; message: string; className?: string }) {
  if (!message || status === "idle" || status === "busy") return null;
  const success = status === "success";
  return <p role={success ? "status" : "alert"} className={`${className} flex items-center gap-2 rounded-md border px-3 py-2 text-xs ${success ? "border-burgundy/20 bg-burgundy/5 text-burgundy" : "border-destructive/25 bg-destructive/[0.06] text-destructive"}`}>{success ? <Check className="h-4 w-4 shrink-0" /> : null}{message}</p>;
}

function blankAddress(customer: { firstName: string; lastName: string; phone: string }, isDefault = false): Omit<Address, "id"> {
  return { label: "", firstName: customer.firstName, lastName: customer.lastName, street: "", postalCode: "", city: "", country: "France", phone: customer.phone, isDefault };
}

function initials(firstName: string, lastName: string) {
  return `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}`.toUpperCase() || "JM";
}

function countryLabel(country: string, locale: "fr" | "en") {
  if (locale === "fr") return country;
  return ({ Belgique: "Belgium", Allemagne: "Germany", "Pays-Bas": "Netherlands" } as Record<string, string>)[country] || country;
}

async function requestJSON<T>(url: string, method: "POST" | "PATCH" | "DELETE", body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
}
