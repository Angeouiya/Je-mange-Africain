"use client";

import { useMemo, useState } from "react";
import { Crown, Search, UserRound, UsersRound, WalletCards } from "lucide-react";
import { AdminEmptyState, AdminErrorState, AdminPageHeader, AdminSectionLoading, SectionTabs } from "@/components/admin/AdminPrimitives";
import type { AdminCustomer } from "@/components/admin/admin-types";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useFetch } from "@/lib/use-fetch";
import { formatPrice, normalize } from "@/lib/format";

type CustomerSegment = "all" | "loyal" | "active" | "new";

function initials(name: string) {
  return name.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "CL";
}

export default function CustomersSection({ locale }: { locale: "fr" | "en" }) {
  const isFr = locale === "fr";
  const { data, loading, error, refetch } = useFetch<{ customers: AdminCustomer[] }>(`/api/admin/customers?locale=${locale}`, [locale]);
  const [segment, setSegment] = useState<CustomerSegment>("all");
  const [query, setQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<AdminCustomer | null>(null);
  const customers = data?.customers || [];
  const loyal = customers.filter((customer) => customer.orders >= 3 || customer.loyalty >= 1000);
  const active = customers.filter((customer) => customer.orders > 0 && !loyal.some((item) => item.id === customer.id));
  const newCustomers = customers.filter((customer) => customer.orders === 0);
  const loyaltyIssued = customers.reduce((sum, customer) => sum + customer.loyalty, 0);
  const walletOutstanding = customers.reduce((sum, customer) => sum + customer.walletCredit, 0);
  const filteredCustomers = useMemo(() => customers.filter((customer) => {
    const matchesSegment = segment === "all" || (segment === "loyal" && (customer.orders >= 3 || customer.loyalty >= 1000)) || (segment === "active" && customer.orders > 0 && customer.orders < 3 && customer.loyalty < 1000) || (segment === "new" && customer.orders === 0);
    const matchesQuery = normalize(`${customer.name} ${customer.email} ${customer.city}`).includes(normalize(query));
    return matchesSegment && matchesQuery;
  }), [customers, query, segment]);

  if (loading) return <AdminSectionLoading label={isFr ? "Analyse du portefeuille client" : "Analysing customer portfolio"} />;
  if (error) return <AdminErrorState message={error} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        variant="workspace"
        accent="#9A4E63"
        icon={<UsersRound className="h-5 w-5" />}
        eyebrow={isFr ? "Relation client" : "Customer relationship"}
        title={isFr ? "Comprendre chaque relation" : "Understand every relationship"}
        description={isFr ? "Le portefeuille est segmenté selon l'activité réelle et la fidélité, sans confondre profils clients et commandes." : "The portfolio is segmented by real activity and loyalty, keeping customer profiles distinct from orders."}
      />

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="min-w-0 rounded-lg border border-black/8 bg-white p-3 sm:p-4"><span className="grid h-8 w-8 place-items-center rounded-md bg-terre/10 text-terre sm:h-9 sm:w-9"><UsersRound className="h-4 w-4" /></span><p className="mt-3 text-lg font-black tabular-nums sm:mt-4 sm:text-2xl">{customers.length}</p><p className="mt-1 text-[9px] font-bold leading-4 text-muted-foreground sm:text-[10px]">{isFr ? "profils enregistrés" : "registered profiles"}</p></div>
        <div className="min-w-0 rounded-lg border border-black/8 bg-white p-3 sm:p-4"><span className="grid h-8 w-8 place-items-center rounded-md bg-gold/15 text-amber-700 sm:h-9 sm:w-9"><Crown className="h-4 w-4" /></span><p className="mt-3 text-lg font-black tabular-nums sm:mt-4 sm:text-2xl">{loyaltyIssued.toLocaleString(isFr ? "fr-FR" : "en-GB")}</p><p className="mt-1 text-[9px] font-bold leading-4 text-muted-foreground sm:text-[10px]">{isFr ? "points en circulation" : "points in circulation"}</p></div>
        <div className="min-w-0 rounded-lg border border-black/8 bg-white p-3 sm:p-4"><span className="grid h-8 w-8 place-items-center rounded-md bg-forest/10 text-forest sm:h-9 sm:w-9"><WalletCards className="h-4 w-4" /></span><p className="mt-3 text-lg font-black tabular-nums sm:mt-4 sm:text-2xl">{formatPrice(walletOutstanding, locale)}</p><p className="mt-1 text-[9px] font-bold leading-4 text-muted-foreground sm:text-[10px]">{isFr ? "crédit disponible" : "wallet credit"}</p></div>
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <SectionTabs value={segment} onChange={setSegment} label={isFr ? "Segments clients" : "Customer segments"} items={[
          { value: "all", label: isFr ? "Tous" : "All", count: customers.length },
          { value: "loyal", label: isFr ? "Ambassadeurs" : "Ambassadors", count: loyal.length },
          { value: "active", label: isFr ? "Actifs" : "Active", count: active.length },
          { value: "new", label: isFr ? "À activer" : "To activate", count: newCustomers.length },
        ]} />
        <label className="relative block w-full xl:max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 bg-white pl-9" placeholder={isFr ? "Nom, e-mail ou ville" : "Name, email or city"} /></label>
      </div>

      {filteredCustomers.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{filteredCustomers.map((customer) => {
        const segmentLabel = customer.orders >= 3 || customer.loyalty >= 1000 ? (isFr ? "Ambassadeur" : "Ambassador") : customer.orders > 0 ? (isFr ? "Actif" : "Active") : (isFr ? "À activer" : "To activate");
        return <button key={customer.id} type="button" onClick={() => setSelectedCustomer(customer)} className="group rounded-lg border border-black/8 bg-white p-4 text-left transition [contain-intrinsic-size:170px] [content-visibility:auto] hover:-translate-y-0.5 hover:border-terre/30 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terre"><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-charcoal text-xs font-black text-white">{initials(customer.name)}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-charcoal">{customer.name}</p><p className="mt-0.5 truncate text-[10px] text-muted-foreground">{customer.email}</p></div><Badge variant="outline" className={segmentLabel.includes("Amb") ? "border-gold/35 bg-gold/10 text-amber-800" : "border-border text-muted-foreground"}>{segmentLabel}</Badge></div><div className="mt-4 grid grid-cols-3 divide-x divide-black/8 border-t border-black/8 pt-3 text-center"><div><p className="text-sm font-black tabular-nums">{customer.orders}</p><p className="mt-0.5 text-[9px] text-muted-foreground">{isFr ? "commandes" : "orders"}</p></div><div><p className="text-sm font-black tabular-nums text-gold">{customer.loyalty}</p><p className="mt-0.5 text-[9px] text-muted-foreground">points</p></div><div><p className="truncate px-1 text-sm font-black">{customer.city || "—"}</p><p className="mt-0.5 text-[9px] text-muted-foreground">{isFr ? "ville" : "city"}</p></div></div></button>;
      })}</div> : <AdminEmptyState icon={<UserRound className="h-5 w-5" />} title={isFr ? "Aucun client dans ce segment" : "No customers in this segment"} description={isFr ? "Modifiez le segment ou la recherche pour afficher d'autres profils." : "Change the segment or search to display other profiles."} />}

      <Dialog open={Boolean(selectedCustomer)} onOpenChange={(open) => { if (!open) setSelectedCustomer(null); }}>
        <DialogContent className="max-w-xl p-0">
          {selectedCustomer ? <><DialogHeader className="border-b border-border px-5 py-5 sm:px-6"><div className="flex items-center gap-3 pr-8"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-charcoal text-sm font-black text-white">{initials(selectedCustomer.name)}</span><div className="min-w-0"><DialogTitle className="truncate text-xl font-black">{selectedCustomer.name}</DialogTitle><DialogDescription className="truncate">{selectedCustomer.email}</DialogDescription></div></div></DialogHeader><div className="px-5 py-6 sm:px-6"><dl className="grid grid-cols-2 gap-x-6 gap-y-5"><div><dt className="text-[10px] font-extrabold uppercase text-muted-foreground">{isFr ? "Ville" : "City"}</dt><dd className="mt-1 text-sm font-bold">{selectedCustomer.city}</dd></div><div><dt className="text-[10px] font-extrabold uppercase text-muted-foreground">{isFr ? "Langue" : "Language"}</dt><dd className="mt-1 text-sm font-bold uppercase">{selectedCustomer.preferredLang}</dd></div><div><dt className="text-[10px] font-extrabold uppercase text-muted-foreground">{isFr ? "Commandes" : "Orders"}</dt><dd className="mt-1 text-2xl font-black tabular-nums">{selectedCustomer.orders}</dd></div><div><dt className="text-[10px] font-extrabold uppercase text-muted-foreground">{isFr ? "Fidélité" : "Loyalty"}</dt><dd className="mt-1 text-2xl font-black tabular-nums text-gold">{selectedCustomer.loyalty} pts</dd></div><div className="col-span-2 rounded-lg bg-forest/[0.055] p-4"><dt className="text-[10px] font-extrabold uppercase text-forest">{isFr ? "Crédit portefeuille" : "Wallet credit"}</dt><dd className="mt-1 text-xl font-black text-forest">{formatPrice(selectedCustomer.walletCredit, locale)}</dd></div></dl></div></> : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
