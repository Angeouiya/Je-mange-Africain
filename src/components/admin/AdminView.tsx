"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  BadgeDollarSign,
  BellRing,
  Boxes,
  ChefHat,
  ChevronRight,
  ClipboardList,
  Fingerprint,
  LogOut,
  Menu,
  Megaphone,
  PackageSearch,
  ShieldCheck,
  Store,
  UserRoundCog,
  UsersRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BrandLockup } from "@/components/shared/BrandLockup";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AdminSectionLoading } from "@/components/admin/AdminPrimitives";
import type { AdminSectionId, DashboardPayload } from "@/components/admin/admin-types";
import { useFetch } from "@/lib/use-fetch";
import { hasAdminPermission, type AdminModule } from "@/lib/admin-permissions";

const OverviewSection = dynamic(() => import("@/components/admin/sections/OverviewSection"), { loading: () => <AdminSectionLoading /> });
const OfferSection = dynamic(() => import("@/components/admin/sections/OfferSection"), { loading: () => <AdminSectionLoading /> });
const OrdersSection = dynamic(() => import("@/components/admin/sections/OrdersSection"), { loading: () => <AdminSectionLoading /> });
const InventorySection = dynamic(() => import("@/components/admin/sections/InventorySection"), { loading: () => <AdminSectionLoading /> });
const CustomersSection = dynamic(() => import("@/components/admin/sections/CustomersSection"), { loading: () => <AdminSectionLoading /> });
const PushCampaignAdmin = dynamic(() => import("@/components/admin/PushCampaignAdmin").then((module) => module.PushCampaignAdmin), { loading: () => <AdminSectionLoading /> });
const AdvertisingSection = dynamic(() => import("@/components/admin/sections/AdvertisingSection"), { loading: () => <AdminSectionLoading /> });
const FinanceSection = dynamic(() => import("@/components/admin/sections/FinanceSection"), { loading: () => <AdminSectionLoading /> });
const GovernanceSection = dynamic(() => import("@/components/admin/sections/GovernanceSection"), { loading: () => <AdminSectionLoading /> });
const TeamSection = dynamic(() => import("@/components/admin/sections/TeamSection"), { loading: () => <AdminSectionLoading /> });

type NavItem = {
  id: AdminSectionId;
  icon: LucideIcon;
  labelFr: string;
  labelEn: string;
  purposeFr: string;
  purposeEn: string;
  module: AdminModule;
};

const NAV_GROUPS: Array<{ labelFr: string; labelEn: string; items: NavItem[] }> = [
  {
    labelFr: "Direction",
    labelEn: "Direction",
    items: [
      { id: "overview", module: "dashboard", icon: BarChart3, labelFr: "Cockpit du jour", labelEn: "Daily cockpit", purposeFr: "Décisions et alertes immédiates", purposeEn: "Immediate decisions and alerts" },
    ],
  },
  {
    labelFr: "Offre commerciale",
    labelEn: "Commercial offer",
    items: [
      { id: "catalog", module: "catalog", icon: PackageSearch, labelFr: "Catalogue", labelEn: "Catalogue", purposeFr: "Produits, prix et publication", purposeEn: "Products, pricing and publishing" },
      { id: "recipes", module: "recipes", icon: ChefHat, labelFr: "Studio recettes", labelEn: "Recipe studio", purposeFr: "Étapes, ingrédients et portions", purposeEn: "Steps, ingredients and servings" },
    ],
  },
  {
    labelFr: "Exécution",
    labelEn: "Fulfilment",
    items: [
      { id: "orders", module: "orders", icon: ClipboardList, labelFr: "Flux commandes", labelEn: "Order flow", purposeFr: "Paiement, préparation et livraison", purposeEn: "Payment, packing and delivery" },
      { id: "inventory", module: "stock", icon: Boxes, labelFr: "Stocks & lots", labelEn: "Stock & batches", purposeFr: "Disponibilité, FEFO et péremption", purposeEn: "Availability, FEFO and expiry" },
    ],
  },
  {
    labelFr: "Relation client",
    labelEn: "Customer growth",
    items: [
      { id: "customers", module: "customers", icon: UsersRound, labelFr: "Portefeuille clients", labelEn: "Customer portfolio", purposeFr: "Profils, fidélité et valeur", purposeEn: "Profiles, loyalty and value" },
      { id: "campaigns", module: "marketing", icon: BellRing, labelFr: "Campagnes push", labelEn: "Push campaigns", purposeFr: "Message mobile et diffusion", purposeEn: "Mobile message and delivery" },
      { id: "advertising", module: "marketing", icon: Megaphone, labelFr: "Régie publicitaire", labelEn: "Advertising desk", purposeFr: "Affiches, emplacements et calendrier", purposeEn: "Artwork, placements and schedule" },
    ],
  },
  {
    labelFr: "Contrôle & sécurité",
    labelEn: "Assurance",
    items: [
      { id: "finance", module: "finance", icon: BadgeDollarSign, labelFr: "Finance & marge", labelEn: "Finance & margin", purposeFr: "Rentabilité et encaissements", purposeEn: "Profitability and payments" },
      { id: "governance", module: "audit", icon: Fingerprint, labelFr: "Sécurité & audit", labelEn: "Security & audit", purposeFr: "Traçabilité, rôles et référentiels", purposeEn: "Traceability, roles and reference data" },
      { id: "team", module: "team", icon: UserRoundCog, labelFr: "Équipe & accès", labelEn: "Team & access", purposeFr: "Invitations, rôles et suspension", purposeEn: "Invitations, roles and suspension" },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

export function AdminView({
  adminEmail = "",
  adminRole = "",
  onLogout,
}: {
  adminEmail?: string;
  adminRole?: string;
  onLogout?: () => void;
}) {
  const [locale, setLocale] = useState<"fr" | "en">("fr");
  const [section, setSection] = useState<AdminSectionId>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const { data: dashboardData } = useFetch<DashboardPayload>(`/api/admin/dashboard?locale=${locale}`, [locale]);
  const availableGroups = useMemo(() => NAV_GROUPS.map((group) => ({ ...group, items: group.items.filter((item) => hasAdminPermission(adminRole, item.module, "read")) })).filter((group) => group.items.length), [adminRole]);
  const availableItems = useMemo(() => availableGroups.flatMap((group) => group.items), [availableGroups]);
  const quickItems = useMemo(() => {
    const priority: AdminSectionId[] = ["overview", "orders", "inventory", "customers", "catalog", "recipes", "campaigns", "advertising", "finance", "governance", "team"];
    return priority.map((id) => availableItems.find((item) => item.id === id)).filter((item): item is NavItem => Boolean(item)).slice(0, 4);
  }, [availableItems]);

  useEffect(() => {
    const syncSectionFromHash = () => {
      const rawSection = window.location.hash.replace("#", "");
      const sectionFromHash = (rawSection === "offer" ? "catalog" : rawSection) as AdminSectionId;
      if (availableItems.some((item) => item.id === sectionFromHash)) setSection(sectionFromHash);
    };
    syncSectionFromHash();
    window.addEventListener("hashchange", syncSectionFromHash);
    return () => window.removeEventListener("hashchange", syncSectionFromHash);
  }, [availableItems]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (availableItems.length && !availableItems.some((item) => item.id === section)) {
      setSection(availableItems[0].id);
    }
  }, [availableItems, section]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const syncViewport = () => setIsDesktop(media.matches);
    syncViewport();
    media.addEventListener("change", syncViewport);
    return () => media.removeEventListener("change", syncViewport);
  }, []);

  const current = useMemo(() => availableItems.find((item) => item.id === section) || availableItems[0] || ALL_ITEMS[0], [availableItems, section]);
  const isFr = locale === "fr";

  const selectSection = (next: AdminSectionId) => {
    setSection(next);
    setSidebarOpen(false);
    window.history.replaceState(null, "", `${window.location.pathname}#${next}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const badgeFor = (id: AdminSectionId) => {
    if (id === "orders") return dashboardData?.kpis.toPrepare || 0;
    if (id === "inventory") return dashboardData?.kpis.outOfStock || dashboardData?.kpis.expiringSoon || 0;
    return 0;
  };

  return (
    <div className="min-h-dvh bg-[#F4F5F1] text-charcoal md:flex">
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[18.5rem] transform flex-col border-r border-white/8 bg-[#1B1B19] text-cream shadow-2xl transition-transform duration-300 md:sticky md:top-0 md:h-dvh md:translate-x-0 md:shadow-none ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        aria-hidden={!isDesktop && !sidebarOpen}
        inert={!isDesktop && !sidebarOpen ? true : undefined}
      >
        <div className="african-kente-stripe h-1.5 shrink-0" />
        <div className="flex items-center justify-between px-5 py-5">
          <BrandLockup context="admin" compact inverse />
          <button type="button" onClick={() => setSidebarOpen(false)} className="grid h-10 w-10 place-items-center rounded-md text-cream/70 hover:bg-white/8 hover:text-white md:hidden" aria-label={isFr ? "Fermer la navigation" : "Close navigation"}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4" aria-label={isFr ? "Navigation professionnelle" : "Professional navigation"}>
          {availableGroups.map((group) => (
            <div key={group.labelFr} className="mt-4 first:mt-1">
              <p className="px-3 text-[10px] font-extrabold uppercase text-cream/35">{isFr ? group.labelFr : group.labelEn}</p>
              <div className="mt-1.5 space-y-1">
                {group.items.map((item) => {
                  const active = section === item.id;
                  const count = badgeFor(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectSection(item.id)}
                      aria-current={active ? "page" : undefined}
                      className={`group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors ${active ? "bg-white text-charcoal" : "text-cream/72 hover:bg-white/7 hover:text-white"}`}
                    >
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-md ${active ? "bg-terre text-white" : "bg-white/6 text-cream/62 group-hover:bg-white/10"}`}>
                        <item.icon className="h-[18px] w-[18px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-extrabold">{isFr ? item.labelFr : item.labelEn}</span>
                        <span className={`mt-0.5 block truncate text-[10px] ${active ? "text-charcoal/55" : "text-cream/38"}`}>{isFr ? item.purposeFr : item.purposeEn}</span>
                      </span>
                      {count > 0 ? <span className={`grid min-w-6 place-items-center rounded px-1.5 py-1 text-[10px] font-black tabular-nums ${active ? "bg-terre/10 text-terre" : "bg-gold/15 text-gold"}`}>{count}</span> : <ChevronRight className={`h-4 w-4 ${active ? "text-charcoal/35" : "text-cream/20"}`} />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/8 p-3">
          <div className="mb-2 flex items-center gap-3 rounded-md bg-white/[0.045] px-3 py-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-forest text-xs font-black text-white">{(adminEmail || "J").slice(0, 1).toUpperCase()}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-bold text-white">{adminEmail || (isFr ? "Session professionnelle" : "Professional session")}</p>
              <p className="mt-0.5 truncate text-[9px] uppercase text-cream/38">{adminRole ? adminRole.replaceAll("_", " ") : (isFr ? "Exploitation" : "Operations")}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1 rounded-md bg-white/[0.035] p-1" aria-label={isFr ? "Langue" : "Language"}>
            {(["fr", "en"] as const).map((language) => <button key={language} type="button" onClick={() => setLocale(language)} className={`h-8 rounded text-[10px] font-extrabold uppercase ${locale === language ? "bg-white text-charcoal" : "text-cream/45 hover:text-white"}`}>{language}</button>)}
          </div>
          <div className="mt-1 grid grid-cols-2 gap-1">
            <Button type="button" variant="ghost" onClick={() => window.location.assign("https://je-mange-africain.com")} className="h-9 justify-start px-2 text-[10px] text-cream/55 hover:bg-white/8 hover:text-white">
              <Store className="mr-1.5 h-3.5 w-3.5" /> {isFr ? "Boutique" : "Store"}
            </Button>
            {onLogout ? (
              <AlertDialog>
                <AlertDialogTrigger asChild><Button type="button" variant="ghost" className="h-9 justify-start px-2 text-[10px] text-cream/55 hover:bg-white/8 hover:text-white"><LogOut className="mr-1.5 h-3.5 w-3.5" /> {isFr ? "Quitter" : "Sign out"}</Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{isFr ? "Fermer la session professionnelle ?" : "Close the professional session?"}</AlertDialogTitle>
                    <AlertDialogDescription>{isFr ? "L'accès aux commandes, aux données clients et aux réglages sera fermé sur cet appareil. Toutes les modifications enregistrées seront conservées." : "Access to orders, customer data and settings will close on this device. Saved changes will remain."}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>{isFr ? "Rester connecté" : "Stay signed in"}</AlertDialogCancel><AlertDialogAction onClick={onLogout} className="bg-destructive text-white hover:bg-destructive/90">{isFr ? "Oui, me déconnecter" : "Yes, sign out"}</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
          </div>
        </div>
      </aside>

      {sidebarOpen ? <button type="button" className="fixed inset-0 z-40 bg-black/35 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} aria-label={isFr ? "Fermer la navigation" : "Close navigation"} /> : null}

      <div className="min-w-0 flex-1 pb-20 md:pb-0">
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-black/8 bg-[#F4F5F1]/92 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <button type="button" onClick={() => setSidebarOpen(true)} className="mr-3 grid h-10 w-10 place-items-center rounded-md border border-border bg-white md:hidden" aria-label={isFr ? "Ouvrir la navigation" : "Open navigation"}><Menu className="h-5 w-5" /></button>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-black text-charcoal">{isFr ? current.labelFr : current.labelEn}</h1>
            <p className="hidden truncate text-[10px] text-muted-foreground sm:block">{isFr ? current.purposeFr : current.purposeEn}</p>
          </div>
          <Badge variant="outline" className="ml-auto h-8 shrink-0 border-forest/25 bg-forest/[0.04] text-[10px] font-bold text-forest"><ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> {isFr ? "Session sécurisée" : "Secure session"}</Badge>
        </header>

        <main className="mx-auto w-full max-w-[100rem] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
          <AnimatePresence mode="wait">
            <motion.div key={section} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: 0.18 }}>
              {section === "overview" ? <OverviewSection locale={locale} onNavigate={selectSection} /> : null}
              {section === "catalog" ? <OfferSection locale={locale} workspace="products" /> : null}
              {section === "recipes" ? <OfferSection locale={locale} workspace="recipes" /> : null}
              {section === "orders" ? <OrdersSection locale={locale} /> : null}
              {section === "inventory" ? <InventorySection locale={locale} /> : null}
              {section === "customers" ? <CustomersSection locale={locale} /> : null}
              {section === "campaigns" ? <PushCampaignAdmin locale={locale} /> : null}
              {section === "advertising" ? <AdvertisingSection locale={locale} /> : null}
              {section === "finance" ? <FinanceSection locale={locale} /> : null}
              {section === "governance" ? <GovernanceSection locale={locale} adminEmail={adminEmail} adminRole={adminRole} /> : null}
              {section === "team" ? <TeamSection locale={locale} /> : null}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid h-[4.4rem] border-t border-black/10 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden" style={{ gridTemplateColumns: `repeat(${quickItems.length + 1}, minmax(0, 1fr))` }} aria-label={isFr ? "Navigation rapide" : "Quick navigation"}>
        {quickItems.map((item) => (
          <button key={item.id} type="button" onClick={() => selectSection(item.id)} className={`flex min-w-0 flex-col items-center justify-center gap-1 text-[9px] font-bold ${section === item.id ? "text-terre" : "text-muted-foreground"}`} aria-current={section === item.id ? "page" : undefined}><item.icon className="h-5 w-5" /><span className="max-w-full truncate px-1">{isFr ? item.labelFr : item.labelEn}</span></button>
        ))}
        <button type="button" onClick={() => setSidebarOpen(true)} className="flex min-w-0 flex-col items-center justify-center gap-1 text-[9px] font-bold text-muted-foreground"><Menu className="h-5 w-5" /><span>{isFr ? "Plus" : "More"}</span></button>
      </nav>
    </div>
  );
}
