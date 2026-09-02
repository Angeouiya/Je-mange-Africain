"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ArrowUpRight, CircleAlert, Crown, Search, UserRound, UsersRound } from "lucide-react";
import { CustomerProfileDialog } from "@/components/admin/customers/CustomerProfileDialog";
import { AdminEmptyState, AdminErrorState, AdminPageHeader, AdminSectionLoading, SectionTabs } from "@/components/admin/AdminPrimitives";
import type { AdminCustomer } from "@/components/admin/admin-types";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, formatPrice, normalize } from "@/lib/format";
import { useFetch } from "@/lib/use-fetch";

type CustomerSegment = "all" | AdminCustomer["segment"];
type CustomerSort = "value" | "recent" | "orders";

function initials(name: string) {
  return name.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "CL";
}

function segmentDetails(segment: AdminCustomer["segment"], isFr: boolean) {
  const details = {
    ambassador: { label: isFr ? "Ambassadeur" : "Ambassador", className: "border-gold/35 bg-gold/10 text-amber-800" },
    active: { label: isFr ? "Actif" : "Active", className: "border-forest/20 bg-forest/5 text-forest" },
    at_risk: { label: isFr ? "À relancer" : "Re-engage", className: "border-red-200 bg-red-50 text-red-700" },
    new: { label: isFr ? "À activer" : "To activate", className: "border-border bg-white text-muted-foreground" },
  };
  return details[segment];
}

export default function CustomersSection({ locale, canUpdate = false }: { locale: "fr" | "en"; canUpdate?: boolean }) {
  const isFr = locale === "fr";
  const { data, loading, error, refetch } = useFetch<{ customers: AdminCustomer[] }>(`/api/admin/customers?locale=${locale}`, [locale]);
  const [segment, setSegment] = useState<CustomerSegment>("all");
  const [sort, setSort] = useState<CustomerSort>("value");
  const [query, setQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<AdminCustomer | null>(null);
  const customers = data?.customers || [];
  const totalRevenue = customers.reduce((sum, customer) => sum + customer.lifetimeValue, 0);
  const ambassadors = customers.filter((customer) => customer.segment === "ambassador");
  const atRisk = customers.filter((customer) => customer.segment === "at_risk");

  const segmentCounts = useMemo(() => customers.reduce<Record<AdminCustomer["segment"], number>>((counts, customer) => {
    counts[customer.segment] += 1;
    return counts;
  }, { ambassador: 0, active: 0, at_risk: 0, new: 0 }), [customers]);

  const filteredCustomers = useMemo(() => customers
    .filter((customer) => {
      const matchesSegment = segment === "all" || customer.segment === segment;
      const matchesQuery = normalize(`${customer.name} ${customer.email} ${customer.phone || ""} ${customer.city} ${customer.country}`).includes(normalize(query));
      return matchesSegment && matchesQuery;
    })
    .sort((left, right) => {
      if (sort === "orders") return right.orders - left.orders;
      if (sort === "recent") return new Date(right.lastOrderAt || right.joinedAt).getTime() - new Date(left.lastOrderAt || left.joinedAt).getTime();
      return right.lifetimeValue - left.lifetimeValue;
    }), [customers, query, segment, sort]);

  if (loading) return <AdminSectionLoading label={isFr ? "Analyse du portefeuille client" : "Analysing customer portfolio"} />;
  if (error) return <AdminErrorState message={error} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        variant="workspace"
        accent="#9A4E63"
        icon={<UsersRound className="h-5 w-5" />}
        eyebrow={isFr ? "Relation client" : "Customer relationship"}
        title={isFr ? "Piloter chaque relation" : "Steer every relationship"}
        description={isFr ? "Une vue commerciale et opérationnelle pour reconnaître les ambassadeurs, suivre les clients actifs et relancer au bon moment." : "A commercial and operational view to recognize ambassadors, follow active customers and re-engage at the right time."}
      />

      <dl className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <Metric icon={<UsersRound className="h-4 w-4" />} iconClass="bg-terre/10 text-terre" value={customers.length.toLocaleString(isFr ? "fr-FR" : "en-GB")} label={isFr ? "profils clients" : "customer profiles"} />
        <Metric icon={<ArrowUpRight className="h-4 w-4" />} iconClass="bg-forest/10 text-forest" value={formatPrice(totalRevenue, locale)} label={isFr ? "valeur cumulée" : "lifetime value"} />
        <Metric icon={<Crown className="h-4 w-4" />} iconClass="bg-gold/15 text-amber-700" value={ambassadors.length.toLocaleString(isFr ? "fr-FR" : "en-GB")} label={isFr ? "ambassadeurs" : "ambassadors"} />
        <Metric icon={<CircleAlert className="h-4 w-4" />} iconClass="bg-red-50 text-red-700" value={atRisk.length.toLocaleString(isFr ? "fr-FR" : "en-GB")} label={isFr ? "relations à relancer" : "customers to re-engage"} />
      </dl>

      <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <SectionTabs value={segment} onChange={setSegment} label={isFr ? "Segments clients" : "Customer segments"} items={[
          { value: "all", label: isFr ? "Tous" : "All", count: customers.length },
          { value: "ambassador", label: isFr ? "Ambassadeurs" : "Ambassadors", count: segmentCounts.ambassador },
          { value: "active", label: isFr ? "Actifs" : "Active", count: segmentCounts.active },
          { value: "at_risk", label: isFr ? "À relancer" : "Re-engage", count: segmentCounts.at_risk },
          { value: "new", label: isFr ? "À activer" : "To activate", count: segmentCounts.new },
        ]} />
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row 2xl:w-auto">
          <label className="relative block min-w-0 flex-1 2xl:w-80"><span className="sr-only">{isFr ? "Rechercher un client" : "Search customers"}</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 bg-white pl-9" placeholder={isFr ? "Nom, e-mail, téléphone ou ville" : "Name, email, phone or city"} /></label>
          <Select value={sort} onValueChange={(value) => setSort(value as CustomerSort)}>
            <SelectTrigger className="h-10 w-full bg-white sm:w-48" aria-label={isFr ? "Trier les clients" : "Sort customers"}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="value">{isFr ? "Valeur client" : "Customer value"}</SelectItem>
              <SelectItem value="recent">{isFr ? "Activité récente" : "Recent activity"}</SelectItem>
              <SelectItem value="orders">{isFr ? "Nombre de commandes" : "Order count"}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredCustomers.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredCustomers.map((customer) => {
            const segment = segmentDetails(customer.segment, isFr);
            return (
              <button key={customer.id} type="button" onClick={() => setSelectedCustomer(customer)} aria-label={`${isFr ? "Ouvrir le profil de" : "Open profile for"} ${customer.name}`} className="group min-w-0 rounded-lg border border-black/8 bg-white p-4 text-left transition [contain-intrinsic-size:205px] [content-visibility:auto] hover:-translate-y-0.5 hover:border-terre/30 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terre">
                <div className="flex min-w-0 items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-charcoal text-xs font-black text-white">{initials(customer.name)}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-charcoal">{customer.name}</p><p className="mt-0.5 truncate text-[10px] text-muted-foreground">{customer.email}</p></div><Badge variant="outline" className={segment.className}>{segment.label}</Badge></div>
                <div className="mt-4 flex items-end justify-between gap-3 border-t border-black/8 pt-3"><div className="min-w-0"><p className="text-[9px] font-extrabold uppercase text-muted-foreground">{isFr ? "Valeur client" : "Lifetime value"}</p><p className="mt-1 truncate text-lg font-black tabular-nums text-charcoal">{formatPrice(customer.lifetimeValue, locale)}</p></div><span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-charcoal/5 text-charcoal transition group-hover:bg-charcoal group-hover:text-white"><ArrowUpRight className="h-4 w-4" /></span></div>
                <dl className="mt-3 grid grid-cols-3 divide-x divide-black/8 text-center"><div className="min-w-0 px-1"><dt className="text-[9px] text-muted-foreground">{isFr ? "Commandes" : "Orders"}</dt><dd className="mt-0.5 text-xs font-black tabular-nums">{customer.orders}</dd></div><div className="min-w-0 px-1"><dt className="text-[9px] text-muted-foreground">{isFr ? "Panier moy." : "Avg. basket"}</dt><dd className="mt-0.5 truncate text-xs font-black tabular-nums">{formatPrice(customer.averageBasket, locale)}</dd></div><div className="min-w-0 px-1"><dt className="text-[9px] text-muted-foreground">{isFr ? "Dernier achat" : "Last order"}</dt><dd className="mt-0.5 truncate text-[10px] font-black">{customer.lastOrderAt ? formatDate(customer.lastOrderAt, locale) : "—"}</dd></div></dl>
                <div className="mt-3 flex min-w-0 items-center justify-between gap-3 border-t border-black/8 pt-3 text-[10px] text-muted-foreground"><span className="truncate">{customer.city}, {customer.country}</span>{customer.openTickets ? <span className="shrink-0 font-bold text-red-700">{customer.openTickets} {isFr ? "demande(s)" : "request(s)"}</span> : <span className="shrink-0">{customer.favorites + customer.savedRecipes} {isFr ? "envies" : "saved"}</span>}</div>
              </button>
            );
          })}
        </div>
      ) : <AdminEmptyState icon={<UserRound className="h-5 w-5" />} title={isFr ? "Aucun client dans ce segment" : "No customers in this segment"} description={isFr ? "Modifiez le segment ou la recherche pour afficher d’autres profils." : "Change the segment or search to display other profiles."} />}

      <CustomerProfileDialog selectedCustomer={selectedCustomer} onClose={() => setSelectedCustomer(null)} locale={locale} canUpdate={canUpdate} />
    </div>
  );
}

function Metric({ icon, iconClass, value, label }: { icon: ReactNode; iconClass: string; value: string; label: string }) {
  return <div className="min-w-0 rounded-lg border border-black/8 bg-white p-3 sm:p-4"><span className={`grid h-8 w-8 place-items-center rounded-md ${iconClass}`}>{icon}</span><p className="mt-3 truncate text-lg font-black tabular-nums text-charcoal sm:mt-4 sm:text-xl">{value}</p><p className="mt-1 text-[9px] font-bold leading-4 text-muted-foreground sm:text-[10px]">{label}</p></div>;
}
