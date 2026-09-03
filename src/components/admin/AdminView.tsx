"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  mobileFr: string;
  mobileEn: string;
  purposeFr: string;
  purposeEn: string;
  module: AdminModule;
  accent: string;
  marker: string;
};

const NAV_GROUPS: Array<{ labelFr: string; labelEn: string; verbFr: string; verbEn: string; items: NavItem[] }> = [
  {
    labelFr: "Direction",
    labelEn: "Direction",
    verbFr: "Décider",
    verbEn: "Decide",
    items: [
      { id: "overview", module: "dashboard", icon: BarChart3, marker: "01", accent: "#D65A32", labelFr: "Décider aujourd'hui", labelEn: "Decide today", mobileFr: "Cockpit", mobileEn: "Cockpit", purposeFr: "Alertes, arbitrages et prochaines actions", purposeEn: "Alerts, decisions and next actions" },
    ],
  },
  {
    labelFr: "Offre commerciale",
    labelEn: "Commercial offer",
    verbFr: "Construire",
    verbEn: "Build",
    items: [
      { id: "catalog", module: "catalog", icon: PackageSearch, marker: "02", accent: "#8A3042", labelFr: "Produits vendus", labelEn: "Products for sale", mobileFr: "Produits", mobileEn: "Products", purposeFr: "Images, prix public, marge et statut", purposeEn: "Images, public price, margin and status" },
      { id: "recipes", module: "recipes", icon: ChefHat, marker: "03", accent: "#D39B24", labelFr: "Recettes achetables", labelEn: "Shoppable recipes", mobileFr: "Recettes", mobileEn: "Recipes", purposeFr: "Composition, substitutions et préparation", purposeEn: "Composition, substitutions and method" },
    ],
  },
  {
    labelFr: "Exécution",
    labelEn: "Fulfilment",
    verbFr: "Opérer",
    verbEn: "Operate",
    items: [
      { id: "orders", module: "orders", icon: ClipboardList, marker: "04", accent: "#326B8A", labelFr: "Orchestrer les commandes", labelEn: "Orchestrate orders", mobileFr: "Commandes", mobileEn: "Orders", purposeFr: "Valider, préparer et remettre au transporteur", purposeEn: "Validate, pack and hand over to carrier" },
      { id: "inventory", module: "stock", icon: Boxes, marker: "05", accent: "#9A4E63", labelFr: "Tracer les lots", labelEn: "Trace batches", mobileFr: "Lots", mobileEn: "Batches", purposeFr: "Disponibilité, FEFO et péremption", purposeEn: "Availability, FEFO and expiry" },
    ],
  },
  {
    labelFr: "Relation client",
    labelEn: "Customer growth",
    verbFr: "Engager",
    verbEn: "Engage",
    items: [
      { id: "customers", module: "customers", icon: UsersRound, marker: "06", accent: "#9A4E63", labelFr: "Développer la relation", labelEn: "Grow relationships", mobileFr: "Clients", mobileEn: "Customers", purposeFr: "Historique, fidélité et valeur client", purposeEn: "History, loyalty and customer value" },
      { id: "campaigns", module: "marketing", icon: BellRing, marker: "07", accent: "#925018", labelFr: "Diffuser sur mobile", labelEn: "Broadcast to mobile", mobileFr: "Push", mobileEn: "Push", purposeFr: "Messages ciblés et résultats de diffusion", purposeEn: "Targeted messages and delivery results" },
      { id: "advertising", module: "marketing", icon: Megaphone, marker: "08", accent: "#C54F36", labelFr: "Piloter les emplacements", labelEn: "Manage placements", mobileFr: "Publicités", mobileEn: "Ads", purposeFr: "Affiches, calendrier et destination", purposeEn: "Artwork, schedule and destination" },
    ],
  },
  {
    labelFr: "Contrôle & sécurité",
    labelEn: "Assurance",
    verbFr: "Contrôler",
    verbEn: "Control",
    items: [
      { id: "finance", module: "finance", icon: BadgeDollarSign, marker: "09", accent: "#8A3042", labelFr: "Mesurer la rentabilité", labelEn: "Measure profitability", mobileFr: "Finance", mobileEn: "Finance", purposeFr: "Coûts bruts, marges et ventes par famille", purposeEn: "Gross costs, margins and sales by family" },
      { id: "governance", module: "audit", icon: Fingerprint, marker: "10", accent: "#55524A", labelFr: "Auditer l'exploitation", labelEn: "Audit operations", mobileFr: "Audit", mobileEn: "Audit", purposeFr: "Journal, conformité et référentiels", purposeEn: "Activity log, compliance and reference data" },
      { id: "team", module: "team", icon: UserRoundCog, marker: "11", accent: "#6C5D7B", labelFr: "Administrer les habilitations", labelEn: "Administer access", mobileFr: "Équipe", mobileEn: "Team", purposeFr: "Inviter, limiter, suspendre ou retirer", purposeEn: "Invite, limit, suspend or remove" },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

function resetAdminViewport() {
  const root = document.documentElement;
  const previousScrollBehavior = root.style.scrollBehavior;
  root.style.scrollBehavior = "auto";
  window.scrollTo(0, 0);
  root.style.scrollBehavior = previousScrollBehavior;
}

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
  const sectionTitleRef = useRef<HTMLHeadingElement>(null);
  const focusSectionTitleRef = useRef(false);
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
    resetAdminViewport();

    if (focusSectionTitleRef.current) {
      focusSectionTitleRef.current = false;
      requestAnimationFrame(() => sectionTitleRef.current?.focus({ preventScroll: true }));
    }
  }, [section]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const syncViewport = () => setIsDesktop(media.matches);
    syncViewport();
    media.addEventListener("change", syncViewport);
    return () => media.removeEventListener("change", syncViewport);
  }, []);

  const current = useMemo(() => availableItems.find((item) => item.id === section) || availableItems[0] || ALL_ITEMS[0], [availableItems, section]);
  const currentGroup = useMemo(() => availableGroups.find((group) => group.items.some((item) => item.id === current.id)) || availableGroups[0], [availableGroups, current.id]);
  const isFr = locale === "fr";

  const selectSection = (next: AdminSectionId) => {
    focusSectionTitleRef.current = next !== section;
    setSection(next);
    setSidebarOpen(false);
    window.history.replaceState(null, "", `${window.location.pathname}#${next}`);
    if (next === section) {
      resetAdminViewport();
      requestAnimationFrame(() => sectionTitleRef.current?.focus({ preventScroll: true }));
    }
  };

  const badgeFor = (id: AdminSectionId) => {
    if (id === "orders") return dashboardData?.kpis.toPrepare || 0;
    if (id === "inventory") return dashboardData?.kpis.outOfStock || dashboardData?.kpis.expiringSoon || 0;
    return 0;
  };

  return (
    <div className="min-h-dvh bg-white text-charcoal md:flex">
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[18.5rem] transform flex-col border-r border-white/8 bg-charcoal text-white shadow-2xl transition-transform duration-300 md:sticky md:top-0 md:h-dvh md:translate-x-0 md:shadow-none ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        aria-hidden={!isDesktop && !sidebarOpen}
        inert={!isDesktop && !sidebarOpen ? true : undefined}
      >
        <div className="african-kente-stripe h-[3px] shrink-0" />
        <div className="flex items-center justify-between px-5 py-5">
          <BrandLockup context="admin" compact inverse />
          <button type="button" onClick={() => setSidebarOpen(false)} className="grid h-10 w-10 place-items-center rounded-md text-cream/70 hover:bg-white/8 hover:text-white md:hidden" aria-label={isFr ? "Fermer la navigation" : "Close navigation"}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4" aria-label={isFr ? "Navigation professionnelle" : "Professional navigation"}>
          {availableGroups.map((group, groupIndex) => (
            <div key={group.labelFr} className="mt-4 first:mt-1">
              <div className="flex items-center gap-2 px-3">
                <span className="text-[9px] font-black tabular-nums text-gold">{String(groupIndex + 1).padStart(2, "0")}</span>
                <p className="text-[9px] font-extrabold uppercase text-white/70">{isFr ? group.labelFr : group.labelEn}</p>
                <span className="ml-auto text-[8px] font-bold uppercase text-white/58">{isFr ? group.verbFr : group.verbEn}</span>
              </div>
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
                      className={`group relative flex w-full items-center gap-3 rounded-md border-l-2 px-3 py-2.5 text-left transition-all ${active ? "bg-white text-charcoal shadow-sm" : "border-transparent text-cream/72 hover:bg-white/7 hover:text-white"}`}
                      style={active ? { borderLeftColor: item.accent } : undefined}
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-white transition-colors" style={{ backgroundColor: active ? item.accent : `${item.accent}2B` }}>
                        <item.icon className="h-[18px] w-[18px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-extrabold">{isFr ? item.labelFr : item.labelEn}</span>
                        <span className={`mt-0.5 block line-clamp-2 text-[9px] leading-4 ${active ? "text-charcoal/72" : "text-white/62"}`}>{isFr ? item.purposeFr : item.purposeEn}</span>
                      </span>
                      {count > 0 ? <span className="grid min-w-6 place-items-center rounded px-1.5 py-1 text-[10px] font-black tabular-nums" style={{ backgroundColor: `${item.accent}18`, color: active ? item.accent : "#F2A900" }}>{count}</span> : active ? <span className="text-[8px] font-black tabular-nums" style={{ color: item.accent }}>{item.marker}</span> : <ChevronRight className="h-4 w-4 text-cream/20" />}
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
              <p className="mt-0.5 truncate text-[9px] uppercase text-white/62">{adminRole ? adminRole.replaceAll("_", " ") : (isFr ? "Exploitation" : "Operations")}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1 rounded-md bg-white/[0.035] p-1" aria-label={isFr ? "Langue" : "Language"}>
            {(["fr", "en"] as const).map((language) => <button key={language} type="button" onClick={() => setLocale(language)} className={`h-8 rounded text-[10px] font-extrabold uppercase ${locale === language ? "bg-white text-charcoal" : "text-cream/65 hover:text-white"}`}>{language}</button>)}
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

      {sidebarOpen ? <button type="button" className="fixed inset-0 z-40 bg-forest-dark/45 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} aria-label={isFr ? "Fermer la navigation" : "Close navigation"} /> : null}

      <div className="min-w-0 flex-1 pb-20 md:pb-0">
        <header className="sticky top-0 z-30 flex h-[4.5rem] items-center border-b bg-white/94 px-4 backdrop-blur-xl sm:px-6 lg:px-8" style={{ borderBottomColor: `${current.accent}35` }}>
          <button type="button" onClick={() => setSidebarOpen(true)} className="mr-3 grid h-10 w-10 place-items-center rounded-md border border-border bg-white md:hidden" aria-label={isFr ? "Ouvrir la navigation" : "Open navigation"}><Menu className="h-5 w-5" /></button>
          <span className="mr-3 hidden h-9 w-9 shrink-0 place-items-center rounded-md text-white sm:grid" style={{ backgroundColor: current.accent }}><current.icon className="h-[18px] w-[18px]" /></span>
          <div className="min-w-0 flex-1">
            <p className="hidden truncate text-[8px] font-black uppercase text-muted-foreground sm:block">{current.marker} · {isFr ? currentGroup?.labelFr : currentGroup?.labelEn}</p>
            <h1 ref={sectionTitleRef} tabIndex={-1} className="truncate text-sm font-black text-charcoal outline-none">{isFr ? current.labelFr : current.labelEn}</h1>
            <p className="hidden truncate text-[9px] text-muted-foreground lg:block">{isFr ? current.purposeFr : current.purposeEn}</p>
          </div>
          <Badge variant="outline" className="ml-3 h-8 shrink-0 border-forest/25 bg-white/70 px-2 text-[9px] font-bold text-forest sm:px-3"><ShieldCheck className="mr-1 h-3.5 w-3.5" /> <span className="hidden sm:inline">{isFr ? "Session sécurisée" : "Secure session"}</span><span className="sm:hidden">{isFr ? "Sûr" : "Secure"}</span></Badge>
        </header>

        <main className="mx-auto w-full max-w-[100rem] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
          <AnimatePresence mode="wait">
            <motion.div key={section} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: 0.18 }}>
              {section === "overview" ? <OverviewSection locale={locale} onNavigate={selectSection} /> : null}
              {section === "catalog" ? <OfferSection locale={locale} workspace="products" /> : null}
              {section === "recipes" ? <OfferSection locale={locale} workspace="recipes" /> : null}
              {section === "orders" ? <OrdersSection locale={locale} canUpdate={hasAdminPermission(adminRole, "orders", "update")} /> : null}
              {section === "inventory" ? <InventorySection locale={locale} /> : null}
              {section === "customers" ? <CustomersSection locale={locale} canUpdate={hasAdminPermission(adminRole, "customers", "update")} /> : null}
              {section === "campaigns" ? <PushCampaignAdmin locale={locale} /> : null}
              {section === "advertising" ? <AdvertisingSection locale={locale} /> : null}
              {section === "finance" ? <FinanceSection locale={locale} /> : null}
              {section === "governance" ? <GovernanceSection locale={locale} adminEmail={adminEmail} adminRole={adminRole} /> : null}
              {section === "team" ? <TeamSection locale={locale} /> : null}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid h-[4.4rem] border-t border-charcoal/10 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden" style={{ gridTemplateColumns: `repeat(${quickItems.length + 1}, minmax(0, 1fr))` }} aria-label={isFr ? "Navigation rapide" : "Quick navigation"}>
        {quickItems.map((item) => (
          <button key={item.id} type="button" onClick={() => selectSection(item.id)} className="relative flex min-w-0 flex-col items-center justify-center gap-1 text-[9px] font-bold text-muted-foreground" style={section === item.id ? { color: item.accent } : undefined} aria-current={section === item.id ? "page" : undefined}>{section === item.id ? <span className="absolute inset-x-3 top-0 h-0.5" style={{ backgroundColor: item.accent }} /> : null}<item.icon className="h-5 w-5" /><span className="max-w-full truncate px-1">{isFr ? item.mobileFr : item.mobileEn}</span></button>
        ))}
        <button type="button" onClick={() => setSidebarOpen(true)} className="flex min-w-0 flex-col items-center justify-center gap-1 text-[9px] font-bold text-muted-foreground"><Menu className="h-5 w-5" /><span>{isFr ? "Plus" : "More"}</span></button>
      </nav>
    </div>
  );
}
