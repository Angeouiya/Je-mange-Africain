"use client";

import { useMemo, useState } from "react";
import { BookOpenCheck, Fingerprint, Languages, ScrollText, ShieldCheck, Tags, UserCog } from "lucide-react";
import { AdminEmptyState, AdminErrorState, AdminPageHeader, AdminSectionLoading, SectionTabs } from "@/components/admin/AdminPrimitives";
import type { AuditEntry } from "@/components/admin/admin-types";
import { Badge } from "@/components/ui/badge";
import { useFetch } from "@/lib/use-fetch";
import { formatDateTime } from "@/lib/format";

type GovernanceTab = "audit" | "workspace";

function actionLabel(action: string, isFr: boolean) {
  const labels: Record<string, [string, string]> = {
    price_change: ["Modification de prix", "Price change"], stock_change: ["Mouvement de stock", "Stock movement"], order_created: ["Création de commande", "Order created"], recipe_create: ["Création de recette", "Recipe created"], recipe_change: ["Modification de recette", "Recipe change"], product_create: ["Création de produit", "Product created"], product_created: ["Création de produit", "Product created"], push_campaign_sent: ["Diffusion d'une campagne", "Campaign sent"],
  };
  return (labels[action] || [action.replaceAll("_", " "), action.replaceAll("_", " ")])[isFr ? 0 : 1];
}

export default function GovernanceSection({ locale, adminEmail, adminRole }: { locale: "fr" | "en"; adminEmail: string; adminRole: string }) {
  const isFr = locale === "fr";
  const [tab, setTab] = useState<GovernanceTab>("audit");
  const auditRequest = useFetch<{ logs: AuditEntry[] }>(`/api/admin/audit?locale=${locale}`, [locale]);
  const categoriesRequest = useFetch<{ categories: Array<{ id: string; name: string }> }>(`/api/categories?locale=${locale}`, [locale]);
  const brandsRequest = useFetch<{ brands: Array<{ id: string; name: string }> }>(`/api/brands?locale=${locale}`, [locale]);
  const logs = auditRequest.data?.logs || [];
  const actors = useMemo(() => new Set(logs.map((log) => log.actor).filter(Boolean)).size, [logs]);

  if (tab === "audit" && auditRequest.loading) return <AdminSectionLoading label={isFr ? "Lecture du journal de contrôle" : "Reading control log"} />;
  if (tab === "audit" && auditRequest.error) return <AdminErrorState message={auditRequest.error} onRetry={auditRequest.refetch} />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        variant="control"
        accent="#55524A"
        icon={<Fingerprint className="h-5 w-5" />}
        eyebrow={isFr ? "Conformité et référentiels" : "Compliance and reference data"}
        title={isFr ? "Gouverner sans ambiguïté" : "Govern without ambiguity"}
        description={isFr ? "Le journal explique qui a fait quoi. L'espace de travail expose uniquement les référentiels et préférences réellement disponibles." : "The log explains who did what. Workspace settings expose only reference data and preferences that are actually available."}
      />

      <SectionTabs value={tab} onChange={setTab} label={isFr ? "Espaces de gouvernance" : "Governance spaces"} items={[
        { value: "audit", label: isFr ? "Journal d'activité" : "Activity log", count: logs.length },
        { value: "workspace", label: isFr ? "Espace de travail" : "Workspace" },
      ]} />

      {tab === "audit" ? (
        logs.length ? <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <section className="border-y border-black/8 bg-white px-4 py-1 sm:px-5"><ol>{logs.map((log, index) => <li key={log.id} className="relative flex gap-4 py-4"><span className="relative z-10 mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-md bg-charcoal text-white"><ScrollText className="h-4 w-4" /></span>{index < logs.length - 1 ? <span className="absolute bottom-0 left-[17px] top-12 w-px bg-border" /> : null}<div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-extrabold text-charcoal">{actionLabel(log.action, isFr)}</p><Badge variant="outline" className="text-[9px]">{log.entityType}</Badge></div><p className="mt-1 text-xs leading-5 text-muted-foreground">{log.reason || (isFr ? "Aucun motif complémentaire enregistré." : "No additional reason recorded.")}</p><p className="mt-2 text-[10px] text-muted-foreground">{formatDateTime(log.createdAt, locale)} · {log.actor || (isFr ? "Système" : "System")}{log.ip ? ` · ${log.ip}` : ""}</p></div></li>)}</ol></section>
          <aside data-testid="governance-metrics" className="grid h-fit grid-cols-[2.5rem_1fr_1fr] items-center gap-3 rounded-lg bg-charcoal p-4 text-white xl:sticky xl:top-24 xl:block xl:p-5"><Fingerprint className="h-6 w-6 text-gold" /><div className="border-l border-white/10 pl-3 xl:mt-5 xl:border-0 xl:pl-0"><p className="text-xl font-black tabular-nums xl:text-3xl">{logs.length}</p><p className="mt-1 text-[9px] leading-3.5 text-white/70 xl:text-[10px]">{isFr ? "actions récentes tracées" : "recent traced actions"}</p></div><div className="border-l border-white/10 pl-3 xl:mt-5 xl:border-0 xl:pl-0"><div className="my-5 hidden h-px bg-white/10 xl:block" /><p className="text-xl font-black tabular-nums">{actors}</p><p className="mt-1 text-[9px] leading-3.5 text-white/70 xl:text-[10px]">{isFr ? "acteurs identifiés" : "identified actors"}</p></div></aside>
        </div> : <AdminEmptyState icon={<ScrollText className="h-5 w-5" />} title={isFr ? "Journal encore vide" : "Log is empty"} description={isFr ? "Les prochaines actions sensibles apparaîtront ici avec leur auteur et leur horodatage." : "Future sensitive actions will appear here with their author and timestamp."} />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="overflow-hidden rounded-lg border border-black/8 bg-white">
            <div className="border-b border-black/8 px-5 py-4"><h3 className="text-sm font-black">{isFr ? "Référentiels publiés" : "Published reference data"}</h3><p className="mt-1 text-[11px] text-muted-foreground">{isFr ? "Ces données structurent les fiches produit et la recherche." : "These records structure product data and search."}</p></div>
            <div className="divide-y divide-border">
              <div className="flex items-center gap-3 px-5 py-4"><span className="grid h-9 w-9 place-items-center rounded-md bg-terre/10 text-terre"><Tags className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="text-xs font-extrabold">{isFr ? "Catégories" : "Categories"}</p><p className="mt-0.5 truncate text-[10px] text-muted-foreground">{categoriesRequest.data?.categories?.map((item) => item.name).join(" · ") || (isFr ? "Chargement" : "Loading")}</p></div><strong className="text-lg tabular-nums">{categoriesRequest.data?.categories?.length || 0}</strong></div>
              <div className="flex items-center gap-3 px-5 py-4"><span className="grid h-9 w-9 place-items-center rounded-md bg-gold/15 text-amber-700"><BookOpenCheck className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="text-xs font-extrabold">{isFr ? "Marques" : "Brands"}</p><p className="mt-0.5 truncate text-[10px] text-muted-foreground">{brandsRequest.data?.brands?.map((item) => item.name).join(" · ") || (isFr ? "Aucune marque publiée" : "No published brands")}</p></div><strong className="text-lg tabular-nums">{brandsRequest.data?.brands?.length || 0}</strong></div>
              <div className="flex items-center gap-3 px-5 py-4"><span className="grid h-9 w-9 place-items-center rounded-md bg-forest/10 text-forest"><Languages className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="text-xs font-extrabold">{isFr ? "Langues d'exploitation" : "Operating languages"}</p><p className="mt-0.5 text-[10px] text-muted-foreground">Français · English</p></div><Badge variant="outline" className="border-forest/25 text-forest">2</Badge></div>
              <div className="flex items-center gap-3 px-5 py-4"><span className="grid h-9 w-9 place-items-center rounded-md bg-charcoal/5 text-charcoal"><UserCog className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="text-xs font-extrabold">{isFr ? "Rôle de la session" : "Session role"}</p><p className="mt-0.5 truncate text-[10px] text-muted-foreground">{adminRole ? adminRole.replaceAll("_", " ") : (isFr ? "Exploitation" : "Operations")}</p></div><Badge variant="outline">RBAC</Badge></div>
            </div>
          </section>
          <aside className="h-fit rounded-lg bg-forest p-5 text-white"><ShieldCheck className="h-6 w-6 text-gold" /><h3 className="mt-5 text-lg font-black">{isFr ? "Session protégée" : "Protected session"}</h3><p className="mt-2 break-all text-xs leading-5 text-white/70">{adminEmail || (isFr ? "Compte professionnel" : "Professional account")}</p><div className="my-5 h-px bg-white/15" /><p className="text-[10px] leading-5 text-white/60">{isFr ? "Les actions sensibles sont liées à l'identité connectée et apparaissent dans le journal d'activité." : "Sensitive actions are linked to the signed-in identity and appear in the activity log."}</p></aside>
        </div>
      )}
    </div>
  );
}
