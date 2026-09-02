"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AtSign,
  Bookmark,
  BriefcaseBusiness,
  Check,
  ChefHat,
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
  Settings,
  ShieldCheck,
  Star,
  Trash2,
  User,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProductCard } from "@/components/shared/ProductCard";
import { RecipeCard } from "@/components/shared/RecipeCard";
import { LogoutConfirmDialog } from "@/components/storefront/LogoutConfirmDialog";
import { dict } from "@/lib/i18n";
import { formatPrice } from "@/lib/format";
import { useStore, type Address } from "@/lib/store";
import { useFetch } from "@/lib/use-fetch";

type AccountSection = "profile" | "addresses" | "saved" | "settings";
type RequestStatus = "idle" | "busy" | "success" | "error";

type AccountResponse = {
  customer: NonNullable<ReturnType<typeof useStore.getState>["customer"]>;
  addresses: Address[];
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
  }, [accountData, setAddresses, setCustomer]);

  useEffect(() => {
    setProfile({ firstName: customer.firstName, lastName: customer.lastName, phone: customer.phone });
  }, [customer.firstName, customer.lastName, customer.phone]);

  const nav: Array<{ id: AccountSection; icon: LucideIcon; label: string }> = [
    { id: "profile", icon: User, label: t.account.profile },
    { id: "addresses", icon: MapPin, label: t.account.addresses },
    { id: "saved", icon: Bookmark, label: locale === "fr" ? "Enregistrés" : "Saved" },
    { id: "settings", icon: Settings, label: locale === "fr" ? "Réglages" : "Settings" },
  ];
  const orderCount = orderData?.orders?.length || 0;
  const defaultAddress = useMemo(() => addresses.find((address) => address.isDefault) || addresses[0], [addresses]);

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
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
      <header className="relative overflow-hidden rounded-lg bg-charcoal px-5 py-6 text-white sm:px-7 sm:py-7">
        <div className="absolute inset-x-0 top-0 h-1 african-kente-stripe" />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-terre text-lg font-black text-white shadow-[0_14px_32px_-18px_rgba(214,90,50,0.9)]">{initials(customer.firstName, customer.lastName)}</span>
            <div className="min-w-0"><p className="text-[10px] font-extrabold uppercase text-gold">{locale === "fr" ? "Espace personnel" : "Personal space"}</p><h1 className="mt-1 truncate font-display text-2xl font-semibold sm:text-3xl">{customer.firstName} {customer.lastName}</h1><p className="mt-1 truncate text-xs text-white/62">{customer.email}</p></div>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-md border border-white/14 bg-white/8 px-3 py-2 text-[11px] font-bold text-white/82"><ShieldCheck className="h-4 w-4 text-emerald-300" />{locale === "fr" ? "Compte protégé" : "Protected account"}</span>
        </div>
      </header>

      <nav className="mt-4 grid grid-cols-4 gap-1 border-y border-border bg-white py-2" aria-label={locale === "fr" ? "Rubriques du compte" : "Account sections"}>
        {nav.map((item) => {
          const Icon = item.icon;
          const active = section === item.id;
          return <button key={item.id} type="button" onClick={() => setSection(item.id)} aria-current={active ? "page" : undefined} className={`relative flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 text-[9px] font-bold transition sm:flex-row sm:gap-2 sm:text-xs ${active ? "bg-charcoal text-white" : "text-muted-foreground hover:bg-muted hover:text-charcoal"}`}><Icon className="h-4 w-4 shrink-0" /><span className="max-w-full truncate">{item.label}</span>{item.id === "addresses" && addresses.length ? <span className={`absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded px-1 text-[8px] ${active ? "bg-gold text-charcoal" : "bg-terre/10 text-terre"}`}>{addresses.length}</span> : null}</button>;
        })}
      </nav>

      <main className="py-6">
        {section === "profile" ? (
          <section aria-labelledby="account-profile-title">
            <SectionHeading eyebrow={locale === "fr" ? "Identité et avantages" : "Identity and benefits"} title={locale === "fr" ? "Mon profil" : "My profile"} description={locale === "fr" ? "Les coordonnées utilisées pour votre compte, vos factures et le suivi de livraison." : "Contact details used for your account, invoices and delivery tracking."} id="account-profile-title" />
            <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
                <TextField id="profile-first-name" label={t.checkout.firstName} value={profile.firstName} onChange={(value) => setProfile({ ...profile, firstName: value })} autoComplete="given-name" required />
                <TextField id="profile-last-name" label={t.checkout.lastName} value={profile.lastName} onChange={(value) => setProfile({ ...profile, lastName: value })} autoComplete="family-name" required />
                <div><Label htmlFor="profile-email" className="mb-1.5 block text-xs font-bold text-charcoal">{t.checkout.email}</Label><div className="relative"><AtSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="profile-email" value={customer.email} readOnly className="bg-muted/45 pl-9" /></div><p className="mt-1 text-[10px] text-muted-foreground">{locale === "fr" ? "Identifiant principal sécurisé" : "Secure primary identifier"}</p></div>
                <div><Label htmlFor="profile-phone" className="mb-1.5 block text-xs font-bold text-charcoal">{locale === "fr" ? "Téléphone" : "Phone"}</Label><div className="relative"><Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="profile-phone" type="tel" autoComplete="tel" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} className="pl-9" required /></div></div>
                <InlineStatus status={profileStatus} message={profileMessage} className="sm:col-span-2" />
                <div className="sm:col-span-2"><Button type="submit" disabled={profileStatus === "busy"} className="w-full bg-terre text-white hover:bg-terre-dark sm:w-auto"><Save className="mr-2 h-4 w-4" />{profileStatus === "busy" ? (locale === "fr" ? "Enregistrement..." : "Saving...") : (locale === "fr" ? "Enregistrer mes coordonnées" : "Save my details")}</Button></div>
              </form>

              <aside className="border-y border-border py-1">
                <StatRow icon={Star} color="#C68A00" label={t.account.loyalty} value={`${customer.loyaltyPoints} pts`} />
                <StatRow icon={Wallet} color="#2F6B4F" label={t.account.wallet} value={formatPrice(customer.walletCredit, locale)} />
                <StatRow icon={Package} color="#C84626" label={t.account.orders} value={String(orderCount)} />
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
            {defaultAddress ? <div className="mt-5 flex items-start gap-3 rounded-lg border border-forest/18 bg-forest/[0.045] p-4"><MapPinCheck className="mt-0.5 h-5 w-5 shrink-0 text-forest" /><div><p className="text-xs font-black text-charcoal">{locale === "fr" ? "Adresse proposée au paiement" : "Address suggested at checkout"}</p><p className="mt-1 text-[11px] text-muted-foreground">{defaultAddress.label} · {defaultAddress.postalCode} {defaultAddress.city}, {defaultAddress.country}</p></div></div> : null}
          </section>
        ) : null}

        {section === "saved" ? <SavedSection locale={locale} savedTab={savedTab} setSavedTab={setSavedTab} favorites={favorites} savedRecipes={savedRecipes} /> : null}

        {section === "settings" ? (
          <section aria-labelledby="account-settings-title">
            <SectionHeading eyebrow={locale === "fr" ? "Préférences et sécurité" : "Preferences and security"} title={locale === "fr" ? "Réglages du compte" : "Account settings"} description={locale === "fr" ? "Une configuration simple, synchronisée avec votre compte." : "A simple configuration synchronized with your account."} id="account-settings-title" />
            <div className="mt-6 divide-y divide-border border-y border-border">
              <SettingRow icon={Languages} title={t.account.language} description={locale === "fr" ? "Langue utilisée dans l'application et les contenus." : "Language used in the application and content."}><div className="inline-flex rounded-lg bg-muted p-1">{(["fr", "en"] as const).map((language) => <button key={language} type="button" onClick={() => void changeLanguage(language)} aria-pressed={locale === language} className={`h-9 rounded-md px-4 text-xs font-bold ${locale === language ? "bg-white text-charcoal shadow-sm" : "text-muted-foreground"}`}>{language === "fr" ? "Français" : "English"}</button>)}</div></SettingRow>
              <SettingRow icon={LockKeyhole} title={locale === "fr" ? "Mot de passe" : "Password"} description={locale === "fr" ? "Recevez un lien sécurisé pour choisir un nouveau mot de passe." : "Receive a secure link to choose a new password."}><Button type="button" variant="outline" size="sm" onClick={() => void requestPasswordChange()} disabled={securityStatus === "busy" || securityStatus === "success"}>{securityStatus === "busy" ? (locale === "fr" ? "Envoi..." : "Sending...") : (locale === "fr" ? "Envoyer le lien" : "Send link")}</Button><InlineStatus status={securityStatus} message={securityMessage} className="mt-3" /></SettingRow>
              <SettingRow icon={LogOut} title={locale === "fr" ? "Fermer la session" : "Close session"} description={locale === "fr" ? "Votre panier restera sur cet appareil après la déconnexion." : "Your cart will stay on this device after sign-out."}><LogoutConfirmDialog><Button type="button" variant="outline" className="border-destructive/25 text-destructive hover:bg-destructive/5 hover:text-destructive"><LogOut className="mr-2 h-4 w-4" />{t.account.logout}</Button></LogoutConfirmDialog></SettingRow>
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

function TextField({ id, label, value, onChange, autoComplete, required }: { id: string; label: string; value: string; onChange: (value: string) => void; autoComplete?: string; required?: boolean }) {
  return <div><Label htmlFor={id} className="mb-1.5 block text-xs font-bold text-charcoal">{label}</Label><Input id={id} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} required={required} /></div>;
}

function StatRow({ icon: Icon, color, label, value }: { icon: LucideIcon; color: string; label: string; value: string }) {
  return <div className="flex items-center gap-3 border-b border-border py-4 last:border-b-0"><span className="grid h-9 w-9 place-items-center rounded-md" style={{ backgroundColor: `${color}14`, color }}><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1 truncate text-xs font-bold text-muted-foreground">{label}</span><strong className="shrink-0 text-sm font-black text-charcoal">{value}</strong></div>;
}

function AddressCard({ address, locale, busy, onEdit, onDefault, onDelete }: { address: Address; locale: "fr" | "en"; busy: boolean; onEdit: () => void; onDefault: () => void; onDelete: () => void }) {
  const HomeIcon = /domicile|home/i.test(address.label) ? Home : BriefcaseBusiness;
  return (
    <article className={`relative rounded-lg border bg-white p-4 ${address.isDefault ? "border-forest/30 shadow-[inset_3px_0_0_#2F6B4F]" : "border-border"}`}>
      <div className="flex items-start gap-3"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-md ${address.isDefault ? "bg-forest/10 text-forest" : "bg-muted text-charcoal"}`}><HomeIcon className="h-[1.125rem] w-[1.125rem]" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-black text-charcoal">{address.label}</h3>{address.isDefault ? <span className="rounded bg-forest/10 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-forest">{locale === "fr" ? "Par défaut" : "Default"}</span> : null}</div><p className="mt-2 text-xs font-bold text-charcoal">{address.firstName} {address.lastName}</p><p className="mt-1 text-[11px] leading-5 text-muted-foreground">{address.street}<br />{address.postalCode} {address.city}<br />{address.country}{address.phone ? <><br />{address.phone}</> : null}</p></div></div>
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">{address.isDefault ? <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-forest"><Check className="h-3.5 w-3.5" />{locale === "fr" ? "Prioritaire" : "Priority"}</span> : <button type="button" onClick={onDefault} disabled={busy} className="min-h-8 text-left text-[10px] font-bold text-terre hover:underline disabled:opacity-50">{locale === "fr" ? "Définir par défaut" : "Make default"}</button>}<div className="flex gap-1"><button type="button" onClick={onEdit} disabled={busy} aria-label={locale === "fr" ? `Modifier l'adresse ${address.label}` : `Edit ${address.label} address`} title={locale === "fr" ? "Modifier" : "Edit"} className="grid h-9 w-9 place-items-center rounded-md border border-border text-muted-foreground hover:border-terre/35 hover:text-terre disabled:opacity-50"><Pencil className="h-4 w-4" /></button><AlertDialog><AlertDialogTrigger asChild><button type="button" disabled={busy} aria-label={locale === "fr" ? `Supprimer l'adresse ${address.label}` : `Delete ${address.label} address`} title={locale === "fr" ? "Supprimer" : "Delete"} className="grid h-9 w-9 place-items-center rounded-md border border-border text-muted-foreground hover:border-destructive/30 hover:text-destructive disabled:opacity-50"><Trash2 className="h-4 w-4" /></button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><span className="mb-1 grid h-11 w-11 place-items-center rounded-lg bg-red-50 text-destructive"><Trash2 className="h-5 w-5" /></span><AlertDialogTitle>{locale === "fr" ? "Supprimer cette adresse ?" : "Delete this address?"}</AlertDialogTitle><AlertDialogDescription>{locale === "fr" ? `L'adresse « ${address.label} » disparaîtra de votre carnet. Les commandes déjà passées conserveront leur adresse de livraison.` : `The “${address.label}” address will be removed from your address book. Existing orders keep their delivery address.`}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{locale === "fr" ? "Conserver" : "Keep"}</AlertDialogCancel><AlertDialogAction onClick={onDelete} className="bg-destructive text-white hover:bg-destructive/90"><Trash2 className="mr-2 h-4 w-4" />{locale === "fr" ? "Oui, supprimer" : "Yes, delete"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></div>
    </article>
  );
}

function AddressEditor({ open, onOpenChange, locale, address, setAddress, editing, status, message, onSubmit }: { open: boolean; onOpenChange: (open: boolean) => void; locale: "fr" | "en"; address: Omit<Address, "id">; setAddress: (address: Omit<Address, "id">) => void; editing: boolean; status: RequestStatus; message: string; onSubmit: (event: FormEvent) => void }) {
  return <Dialog open={open} onOpenChange={(next) => status !== "busy" && onOpenChange(next)}><DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto p-5 sm:max-w-xl sm:p-6"><DialogHeader><span className="grid h-11 w-11 place-items-center rounded-lg bg-terre/10 text-terre"><MapPin className="h-5 w-5" /></span><DialogTitle>{editing ? (locale === "fr" ? "Modifier l'adresse" : "Edit address") : (locale === "fr" ? "Nouvelle adresse" : "New address")}</DialogTitle><DialogDescription>{locale === "fr" ? "Ces informations seront proposées au paiement et utilisées par le transporteur." : "These details will be suggested at checkout and used by the carrier."}</DialogDescription></DialogHeader><form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2"><TextField id="address-label" label={locale === "fr" ? "Nom de l'adresse" : "Address name"} value={address.label} onChange={(value) => setAddress({ ...address, label: value })} autoComplete="off" required /><div className="hidden sm:block" /><TextField id="address-first-name" label={locale === "fr" ? "Prénom" : "First name"} value={address.firstName} onChange={(value) => setAddress({ ...address, firstName: value })} autoComplete="given-name" required /><TextField id="address-last-name" label={locale === "fr" ? "Nom" : "Last name"} value={address.lastName} onChange={(value) => setAddress({ ...address, lastName: value })} autoComplete="family-name" required /><div className="sm:col-span-2"><TextField id="address-street" label={locale === "fr" ? "Adresse complète" : "Street address"} value={address.street} onChange={(value) => setAddress({ ...address, street: value })} autoComplete="street-address" required /></div><TextField id="address-postal-code" label={locale === "fr" ? "Code postal" : "Postal code"} value={address.postalCode} onChange={(value) => setAddress({ ...address, postalCode: value })} autoComplete="postal-code" required /><TextField id="address-city" label={locale === "fr" ? "Ville" : "City"} value={address.city} onChange={(value) => setAddress({ ...address, city: value })} autoComplete="address-level2" required /><div><Label htmlFor="address-country" className="mb-1.5 block text-xs font-bold text-charcoal">{locale === "fr" ? "Pays" : "Country"}</Label><select id="address-country" value={address.country} onChange={(event) => setAddress({ ...address, country: event.target.value })} autoComplete="country-name" className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm text-charcoal outline-none focus:border-terre focus:ring-2 focus:ring-terre/20">{countries.map((country) => <option key={country} value={country}>{countryLabel(country, locale)}</option>)}</select></div><TextField id="address-phone" label={locale === "fr" ? "Téléphone du destinataire" : "Recipient phone"} value={address.phone || ""} onChange={(value) => setAddress({ ...address, phone: value })} autoComplete="tel" required /><label className="flex min-h-11 items-center gap-2.5 rounded-lg border border-border bg-muted/30 px-3 text-xs font-bold text-charcoal sm:col-span-2"><Checkbox checked={Boolean(address.isDefault)} onCheckedChange={(checked) => setAddress({ ...address, isDefault: checked === true })} />{locale === "fr" ? "Proposer cette adresse en priorité au paiement" : "Suggest this address first at checkout"}</label><InlineStatus status={status} message={message} className="sm:col-span-2" /><DialogFooter className="mt-2 sm:col-span-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={status === "busy"}>{locale === "fr" ? "Annuler" : "Cancel"}</Button><Button type="submit" disabled={status === "busy"} className="bg-terre text-white hover:bg-terre-dark">{status === "busy" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{editing ? (locale === "fr" ? "Enregistrer" : "Save") : (locale === "fr" ? "Ajouter au carnet" : "Add to address book")}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function SavedSection({ locale, savedTab, setSavedTab, favorites, savedRecipes }: { locale: "fr" | "en"; savedTab: "products" | "recipes"; setSavedTab: (tab: "products" | "recipes") => void; favorites: string[]; savedRecipes: string[] }) {
  const t = dict[locale];
  const navigate = useStore((state) => state.navigate);
  const { data: catalogue } = useFetch(`/api/catalog?locale=${locale}&pageSize=100`, [locale]);
  const { data: recipeData } = useFetch(`/api/recipes?locale=${locale}`, [locale]);
  const products = (catalogue?.products || []).filter((product: { id: string }) => favorites.includes(product.id));
  const recipes = (recipeData?.recipes || []).filter((recipe: { id: string }) => savedRecipes.includes(recipe.id));
  return <section aria-labelledby="account-saved-title"><SectionHeading eyebrow={locale === "fr" ? "Ma sélection" : "My selection"} title={locale === "fr" ? "Éléments enregistrés" : "Saved items"} description={locale === "fr" ? "Retrouvez les produits et recettes que vous avez mis de côté." : "Find the products and recipes you saved for later."} id="account-saved-title" /><div className="mt-5 inline-flex rounded-lg border border-border bg-white p-1" role="tablist" aria-label={locale === "fr" ? "Type d'éléments enregistrés" : "Saved item type"}><button type="button" role="tab" aria-selected={savedTab === "products"} onClick={() => setSavedTab("products")} className={`h-9 rounded-md px-3 text-xs font-bold ${savedTab === "products" ? "bg-charcoal text-white" : "text-muted-foreground"}`}>{t.account.favorites} <span className="ml-1 opacity-65">{favorites.length}</span></button><button type="button" role="tab" aria-selected={savedTab === "recipes"} onClick={() => setSavedTab("recipes")} className={`h-9 rounded-md px-3 text-xs font-bold ${savedTab === "recipes" ? "bg-charcoal text-white" : "text-muted-foreground"}`}>{t.account.savedRecipes} <span className="ml-1 opacity-65">{savedRecipes.length}</span></button></div>{savedTab === "products" ? (products.length ? <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{products.map((product: any, index: number) => <ProductCard key={product.id} product={product} index={index} compact />)}</div> : <EmptyFeature icon={Heart} title={t.account.favorites} description={locale === "fr" ? "Ajoutez des produits depuis le catalogue pour les retrouver ici." : "Save products from the catalogue to find them here."} actionLabel={locale === "fr" ? "Parcourir le catalogue" : "Browse catalogue"} onAction={() => navigate("catalog")} />) : (recipes.length ? <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{recipes.map((recipe: any, index: number) => <RecipeCard key={recipe.id} recipe={recipe} index={index} />)}</div> : <EmptyFeature icon={ChefHat} title={t.account.savedRecipes} description={locale === "fr" ? "Enregistrez une recette pour la retrouver rapidement et préparer son panier." : "Save a recipe to find it quickly and prepare its basket."} actionLabel={locale === "fr" ? "Découvrir les recettes" : "Discover recipes"} onAction={() => navigate("recipes")} />)}</section>;
}

function SettingRow({ icon: Icon, title, description, children }: { icon: LucideIcon; title: string; description: string; children: React.ReactNode }) {
  return <div className="grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-charcoal/5 text-charcoal"><Icon className="h-4 w-4" /></span><div><h3 className="text-sm font-black text-charcoal">{title}</h3><p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">{description}</p></div></div><div>{children}</div></div>;
}

function EmptyFeature({ icon: Icon, title, description, actionLabel, onAction }: { icon: LucideIcon; title: string; description: string; actionLabel: string; onAction: () => void }) {
  return <div className="mt-6 border-y border-border py-10 text-center"><Icon className="mx-auto h-9 w-9 text-muted-foreground/40" /><h3 className="mt-3 text-sm font-black text-charcoal">{title}</h3><p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted-foreground">{description}</p><Button type="button" variant="outline" size="sm" onClick={onAction} className="mt-4">{actionLabel}</Button></div>;
}

function InlineStatus({ status, message, className = "" }: { status: RequestStatus; message: string; className?: string }) {
  if (!message || status === "idle" || status === "busy") return null;
  const success = status === "success";
  return <p role={success ? "status" : "alert"} className={`${className} flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${success ? "border-forest/20 bg-forest/5 text-forest" : "border-red-200 bg-red-50 text-red-800"}`}>{success ? <Check className="h-4 w-4 shrink-0" /> : null}{message}</p>;
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
