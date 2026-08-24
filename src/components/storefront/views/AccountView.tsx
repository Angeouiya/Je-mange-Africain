"use client";

import { useState } from "react";
import {
  User, MapPin, Package, Heart, ChefHat, ListChecks, Star, Wallet, Bell,
  LifeBuoy, LogOut, Mail, Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { useFetch } from "@/lib/use-fetch";
import { ProductCard } from "@/components/shared/ProductCard";
import { RecipeCard } from "@/components/shared/RecipeCard";
import { formatPrice } from "@/lib/format";
import { toast } from "sonner";

export function AccountView() {
  const locale = useStore((s) => s.locale);
  const customer = useStore((s) => s.customer);
  const login = useStore((s) => s.login);
  const logout = useStore((s) => s.logout);
  const favorites = useStore((s) => s.favorites);
  const savedRecipes = useStore((s) => s.savedRecipes);
  const setLocale = useStore((s) => s.setLocale);
  const navigate = useStore((s) => s.navigate);
  const addresses = useStore((s) => s.addresses);
  const t = dict[locale];
  const [email, setEmail] = useState("");
  const [section, setSection] = useState("profile");

  if (!customer) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-terre/10">
          <User className="h-8 w-8 text-terre" />
        </div>
        <h1 className="text-2xl font-bold text-charcoal">{t.nav.login}</h1>
        <p className="text-center text-sm text-muted-foreground">{locale === "fr" ? "Connectez-vous pour accéder à votre compte." : "Sign in to access your account."}</p>
        <form onSubmit={(e) => { e.preventDefault(); if (email) { login(email); toast.success(locale === "fr" ? "Connexion réussie" : "Signed in"); } }} className="w-full space-y-3">
          <div>
            <Label className="mb-1 block text-xs font-semibold">E-mail</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.fr" required />
          </div>
          <Button type="submit" className="w-full bg-terre text-cream hover:bg-terre-dark">{t.nav.login}</Button>
        </form>
        <p className="text-[11px] text-muted-foreground">{locale === "fr" ? "Astuce : utilisez un email contenant « admin » pour voir l'espace administration." : "Tip: use an email containing 'admin' to see the admin area."}</p>
      </div>
    );
  }

  const nav = [
    { id: "profile", icon: User, label: t.account.profile },
    { id: "orders", icon: Package, label: t.account.orders },
    { id: "favorites", icon: Heart, label: t.account.favorites },
    { id: "savedRecipes", icon: ChefHat, label: t.account.savedRecipes },
    { id: "lists", icon: ListChecks, label: t.account.lists },
    { id: "loyalty", icon: Star, label: t.account.loyalty },
    { id: "wallet", icon: Wallet, label: t.account.wallet },
    { id: "notifications", icon: Bell, label: t.account.notifications },
    { id: "claims", icon: LifeBuoy, label: t.account.claims },
    { id: "settings", icon: Settings, label: t.account.language },
  ];

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

      <div className="grid gap-5 md:grid-cols-[220px_1fr]">
        <aside className="space-y-1">
          {nav.map((n) => (
            <button key={n.id} onClick={() => setSection(n.id)} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${section === n.id ? "bg-terre text-cream" : "text-charcoal hover:bg-muted"}`}>
              <n.icon className="h-4 w-4" /> {n.label}
            </button>
          ))}
          <button onClick={() => { logout(); navigate("home"); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-destructive hover:bg-red-50">
            <LogOut className="h-4 w-4" /> {t.account.logout}
          </button>
        </aside>

        <div className="rounded-2xl border border-border bg-card p-5">
          {section === "profile" && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-charcoal">{t.account.profile}</h2>
              <div className="grid grid-cols-2 gap-3">
                <FieldReadonly label={t.checkout.firstName} value={customer.firstName} />
                <FieldReadonly label={t.checkout.lastName} value={customer.lastName} />
                <FieldReadonly label={t.checkout.email} value={customer.email} />
                <div>
                  <Label className="mb-1 block text-xs font-semibold text-charcoal">{t.account.language}</Label>
                  <div className="flex gap-1">
                    {(["fr", "en"] as const).map((l) => (
                      <button key={l} onClick={() => setLocale(l)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${locale === l ? "bg-terre text-cream" : "bg-muted text-charcoal"}`}>{l.toUpperCase()}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-2">
                <Stat label={t.account.loyalty} value={`${customer.loyaltyPoints} pts`} icon={Star} color="#F2A900" />
                <Stat label={t.account.wallet} value={formatPrice(customer.walletCredit, locale)} icon={Wallet} color="#3F681C" />
                <Stat label={t.account.orders} value="1" icon={Package} color="#D65A32" />
              </div>
            </div>
          )}
          {section === "orders" && (
            <div>
              <Button onClick={() => navigate("orders")} variant="outline" className="mb-3">{t.orders.title}</Button>
              <p className="text-sm text-muted-foreground">{locale === "fr" ? "Voir l'historique complet." : "See full history."}</p>
            </div>
          )}
          {section === "favorites" && <FavoritesSection locale={locale} favorites={favorites} />}
          {section === "savedRecipes" && <SavedRecipesSection locale={locale} savedRecipes={savedRecipes} />}
          {section === "lists" && <EmptyFeature icon={ListChecks} title={t.account.lists} locale={locale} />}
          {section === "loyalty" && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-charcoal">{t.account.loyalty}</h2>
              <div className="rounded-xl bg-gold/10 p-4">
                <p className="text-3xl font-extrabold text-gold">{customer.loyaltyPoints} pts</p>
                <p className="text-xs text-muted-foreground">{locale === "fr" ? "1 € = 1 point · 100 pts = 5 € de réduction" : "€1 = 1 point · 100 pts = €5 off"}</p>
              </div>
            </div>
          )}
          {section === "wallet" && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-charcoal">{t.account.wallet}</h2>
              <div className="rounded-xl bg-forest/10 p-4">
                <p className="text-2xl font-bold text-forest">{formatPrice(customer.walletCredit, locale)}</p>
                <p className="text-xs text-muted-foreground">{locale === "fr" ? "Avoir disponible" : "Available credit"}</p>
              </div>
              <Badge variant="outline" className="border-terre/40">CADEAU-JMA-25 · 25 €</Badge>
            </div>
          )}
          {section === "notifications" && <EmptyFeature icon={Bell} title={t.account.notifications} locale={locale} />}
          {section === "claims" && <EmptyFeature icon={LifeBuoy} title={t.account.claims} locale={locale} />}
          {section === "settings" && (
            <div>
              <h2 className="mb-2 text-lg font-bold text-charcoal">{t.account.language}</h2>
              <div className="flex gap-1">
                {(["fr", "en"] as const).map((l) => (
                  <button key={l} onClick={() => setLocale(l)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${locale === l ? "bg-terre text-cream" : "bg-muted text-charcoal"}`}>{l === "fr" ? "Français" : "English"}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FieldReadonly({ label, value }: { label: string; value: string }) {
  return <div><Label className="mb-1 block text-xs font-semibold text-charcoal">{label}</Label><Input value={value} readOnly className="bg-muted/40" /></div>;
}
function Stat({ label, value, icon: Icon, color }: any) {
  return (
    <div className="rounded-xl border border-border p-3">
      <Icon className="h-4 w-4" style={{ color }} />
      <p className="mt-1 text-sm font-bold text-charcoal">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
function EmptyFeature({ icon: Icon, title, locale }: any) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <Icon className="h-10 w-10 text-muted-foreground/40" />
      <p className="text-sm font-medium text-charcoal">{title}</p>
      <p className="text-xs text-muted-foreground">{locale === "fr" ? "Bientôt disponible." : "Coming soon."}</p>
    </div>
  );
}

function FavoritesSection({ locale, favorites }: { locale: string; favorites: string[] }) {
  const t = dict[locale as "fr" | "en"];
  // fetch a few products — use catalog all then filter; simpler: fetch each (small)
  const { data } = useFetch(`/api/catalog?locale=${locale}&pageSize=100`, []);
  const products = (data?.products || []).filter((p: any) => favorites.includes(p.id));
  if (products.length === 0) return <EmptyFeature icon={Heart} title={t.account.favorites} locale={locale} />;
  return (
    <div>
      <h2 className="mb-3 text-lg font-bold text-charcoal">{t.account.favorites} ({products.length})</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{products.map((p: any, i: number) => <ProductCard key={p.id} product={p} index={i} />)}</div>
    </div>
  );
}
function SavedRecipesSection({ locale, savedRecipes }: { locale: string; savedRecipes: string[] }) {
  const t = dict[locale as "fr" | "en"];
  const { data } = useFetch(`/api/recipes?locale=${locale}`, []);
  const recipes = (data?.recipes || []).filter((r: any) => savedRecipes.includes(r.id));
  if (recipes.length === 0) return <EmptyFeature icon={ChefHat} title={t.account.savedRecipes} locale={locale} />;
  return (
    <div>
      <h2 className="mb-3 text-lg font-bold text-charcoal">{t.account.savedRecipes} ({recipes.length})</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{recipes.map((r: any, i: number) => <RecipeCard key={r.id} recipe={r} index={i} />)}</div>
    </div>
  );
}
