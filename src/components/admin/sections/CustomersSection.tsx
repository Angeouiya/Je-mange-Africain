"use client";

import { useMemo, useState } from "react";
import { Download, UserRound, UsersRound } from "lucide-react";
import { CustomerPortfolioOverview } from "@/components/admin/customers/CustomerPortfolioOverview";
import { CustomerProfileDialog } from "@/components/admin/customers/CustomerProfileDialog";
import { CustomerRegister } from "@/components/admin/customers/CustomerRegister";
import { AdminEmptyState, AdminErrorState, AdminPageHeader, AdminSearchField, AdminSectionLoading, SectionTabs } from "@/components/admin/AdminPrimitives";
import type { AdminCustomer, AdminCustomerPortfolioPayload } from "@/components/admin/admin-types";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { normalize } from "@/lib/format";
import { useFetch } from "@/lib/use-fetch";

type CustomerSegment = "all" | AdminCustomer["segment"];
type CustomerSort = "priority" | "value" | "recent" | "orders";

export default function CustomersSection({ locale, canUpdate = false }: { locale: "fr" | "en"; canUpdate?: boolean }) {
  const isFr = locale === "fr";
  const { data, loading, error, refetch } = useFetch<AdminCustomerPortfolioPayload>(`/api/admin/customers?locale=${locale}`, [locale]);
  const [segment, setSegment] = useState<CustomerSegment>("all");
  const [sort, setSort] = useState<CustomerSort>("priority");
  const [query, setQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<AdminCustomer | null>(null);
  const customers = data?.customers || [];
  const actionScoreByCustomer = useMemo(() => new Map((data?.actions || []).map((action) => [action.customerId, action.score])), [data?.actions]);

  const filteredCustomers = useMemo(() => customers
    .filter((customer) => {
      const matchesSegment = segment === "all" || customer.segment === segment;
      const matchesQuery = normalize(`${customer.name} ${customer.email} ${customer.phone || ""} ${customer.city} ${customer.country}`).includes(normalize(query));
      return matchesSegment && matchesQuery;
    })
    .sort((left, right) => {
      if (sort === "orders") return right.orders - left.orders;
      if (sort === "recent") return new Date(right.lastOrderAt || right.joinedAt).getTime() - new Date(left.lastOrderAt || left.joinedAt).getTime();
      if (sort === "priority") return (actionScoreByCustomer.get(right.id) || 0) - (actionScoreByCustomer.get(left.id) || 0) || right.lifetimeValue - left.lifetimeValue;
      return right.lifetimeValue - left.lifetimeValue;
    }), [actionScoreByCustomer, customers, query, segment, sort]);

  if (loading) return <AdminSectionLoading label={isFr ? "Analyse du portefeuille client" : "Analysing customer portfolio"} />;
  if (error || !data) return <AdminErrorState message={error} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        variant="workspace"
        accent="#E66A3A"
        icon={<UsersRound className="h-5 w-5" />}
        eyebrow={isFr ? "Relation client" : "Customer relationship"}
        title={isFr ? "Piloter chaque relation" : "Steer every relationship"}
        description={isFr ? "Mesurez la fidélité, traitez les demandes et ouvrez chaque dossier avec une prochaine action explicite." : "Measure loyalty, resolve requests and open every profile with an explicit next action."}
      />

      <CustomerPortfolioOverview summary={data.summary} locale={locale} />

      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <SectionTabs value={segment} onChange={setSegment} label={isFr ? "Segments clients" : "Customer segments"} items={[
          { value: "all", label: isFr ? "Tous" : "All", count: data.summary.total },
          { value: "ambassador", label: isFr ? "Ambassadeurs" : "Ambassadors", count: data.summary.segments.ambassador },
          { value: "active", label: isFr ? "Actifs" : "Active", count: data.summary.segments.active },
          { value: "at_risk", label: isFr ? "À relancer" : "Re-engage", count: data.summary.segments.at_risk },
          { value: "new", label: isFr ? "À activer" : "To activate", count: data.summary.segments.new },
        ]} />
        <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_12rem_auto] xl:w-[36rem]">
          <AdminSearchField value={query} onChange={setQuery} label={isFr ? "Rechercher un client" : "Search customers"} placeholder={isFr ? "Nom, e-mail, téléphone ou ville" : "Name, email, phone or city"} resultCount={filteredCustomers.length} totalCount={customers.length} locale={locale} />
          <Select value={sort} onValueChange={(value) => setSort(value as CustomerSort)}>
            <SelectTrigger className="h-10 w-full bg-white" aria-label={isFr ? "Trier les clients" : "Sort customers"}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="priority">{isFr ? "Priorité relationnelle" : "Relationship priority"}</SelectItem>
              <SelectItem value="value">{isFr ? "Valeur client" : "Customer value"}</SelectItem>
              <SelectItem value="recent">{isFr ? "Activité récente" : "Recent activity"}</SelectItem>
              <SelectItem value="orders">{isFr ? "Nombre de commandes" : "Order count"}</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="sm" disabled={!filteredCustomers.length} onClick={() => downloadCustomersCsv(filteredCustomers, locale)} className="h-10 border-charcoal/12 px-3"><Download className="h-4 w-4 sm:mr-1.5" /><span className="sr-only sm:not-sr-only">{isFr ? "Exporter" : "Export"}</span></Button>
        </div>
      </div>

      {filteredCustomers.length ? <CustomerRegister customers={filteredCustomers} actions={data.actions} locale={locale} onSelect={setSelectedCustomer} /> : <AdminEmptyState icon={<UserRound className="h-5 w-5" />} title={isFr ? "Aucun client dans ce segment" : "No customers in this segment"} description={isFr ? "Modifiez le segment ou la recherche pour afficher d'autres profils." : "Change the segment or search to display other profiles."} />}

      <CustomerProfileDialog selectedCustomer={selectedCustomer} onClose={() => setSelectedCustomer(null)} locale={locale} canUpdate={canUpdate} />
    </div>
  );
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function downloadCustomersCsv(customers: AdminCustomer[], locale: "fr" | "en") {
  const headings = locale === "fr"
    ? ["Nom", "E-mail", "Téléphone", "Segment", "Ville", "Pays", "Langue", "Commandes", "Valeur client", "Panier moyen", "Dernier achat", "Demandes ouvertes"]
    : ["Name", "Email", "Phone", "Segment", "City", "Country", "Language", "Orders", "Lifetime value", "Average basket", "Last purchase", "Open requests"];
  const rows = customers.map((customer) => [customer.name, customer.email, customer.phone || "", customer.segment, customer.city, customer.country, customer.preferredLang, customer.orders, customer.lifetimeValue, customer.averageBasket, customer.lastOrderAt || "", customer.openTickets]);
  const csv = [headings, ...rows].map((row) => row.map(csvCell).join(";")).join("\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "je-mange-africain-clients.csv";
  link.click();
  URL.revokeObjectURL(url);
}
