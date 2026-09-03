import { ArrowRight, CircleAlert, Crown, Headphones, MapPin, Sparkles, UserRoundCheck } from "lucide-react";
import type { AdminCustomer, AdminCustomerPortfolioPayload } from "@/components/admin/admin-types";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatPrice } from "@/lib/format";
import { customerActionCopy, customerInitials, customerSegmentDetails } from "@/components/admin/customers/customer-labels";

type Locale = "fr" | "en";
type Action = AdminCustomerPortfolioPayload["actions"][number];

export function CustomerRegister({ customers, actions, locale, onSelect }: { customers: AdminCustomer[]; actions: Action[]; locale: Locale; onSelect: (customer: AdminCustomer) => void }) {
  const isFr = locale === "fr";
  const customersById = new Map(customers.map((customer) => [customer.id, customer]));
  const actionsByCustomer = new Map(actions.map((action) => [action.customerId, action]));
  const visibleActions = actions.filter((action) => customersById.has(action.customerId));

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_19rem]">
      <section className="min-w-0 border-y border-charcoal/8 bg-white" aria-labelledby="customer-register-title">
        <div className="flex items-end justify-between gap-3 border-b border-charcoal/8 px-3 py-3 sm:px-4"><div><p className="text-[9px] font-black uppercase text-terre">{isFr ? "Registre relationnel" : "Relationship register"}</p><h3 id="customer-register-title" className="mt-1 text-sm font-black text-charcoal">{isFr ? "Profils et prochain mouvement" : "Profiles and next move"}</h3></div><span className="text-[9px] font-bold text-muted-foreground">{customers.length} {isFr ? "affichés" : "shown"}</span></div>
        <div className="hidden grid-cols-[minmax(11rem,1.3fr)_5.5rem_6rem_6rem_1.25rem] gap-2 border-b border-charcoal/8 bg-[#FAF9F7] px-4 py-2 text-[8px] font-black uppercase text-muted-foreground xl:grid"><span>{isFr ? "Identité" : "Identity"}</span><span>{isFr ? "Cycle" : "Lifecycle"}</span><span className="text-right">{isFr ? "Valeur" : "Value"}</span><span className="text-right">{isFr ? "Activité" : "Activity"}</span><span /></div>
        <div className="divide-y divide-charcoal/8">
          {customers.map((customer) => {
            const segment = customerSegmentDetails(customer.segment, locale);
            const action = actionsByCustomer.get(customer.id);
            return (
              <button key={customer.id} type="button" onClick={() => onSelect(customer)} aria-label={`${isFr ? "Ouvrir le profil de" : "Open profile for"} ${customer.name}`} className="group block w-full px-3 py-3 text-left transition hover:bg-terre/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-terre sm:px-4">
                <span className="hidden grid-cols-[minmax(11rem,1.3fr)_5.5rem_6rem_6rem_1.25rem] items-center gap-2 xl:grid">
                  <span className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-terre text-[10px] font-black text-white">{customerInitials(customer.name)}</span><span className="min-w-0"><strong className="block truncate text-xs text-charcoal">{customer.name}</strong><span className="mt-0.5 block truncate text-[9px] text-muted-foreground">{customer.email}</span><span className="mt-1 flex items-center gap-1 truncate text-[8px] text-muted-foreground"><MapPin className="h-2.5 w-2.5" />{customer.city}, {customer.country}</span></span></span>
                  <span><Badge variant="outline" className={`text-[8px] ${segment.className}`}>{segment.label}</Badge><span className="mt-1.5 block text-[8px] font-bold text-terre">{action ? customerActionCopy(action, locale).title : segment.move}</span></span>
                  <span className="text-right"><strong className="block text-xs tabular-nums text-charcoal">{formatPrice(customer.lifetimeValue, locale)}</strong><span className="mt-1 block text-[8px] text-muted-foreground">{formatPrice(customer.averageBasket, locale)} {isFr ? "moy." : "avg."}</span></span>
                  <span className="text-right"><strong className="block text-xs tabular-nums text-charcoal">{customer.orders} {isFr ? "cmd." : "orders"}</strong><span className="mt-1 block text-[8px] text-muted-foreground">{customer.lastOrderAt ? formatDate(customer.lastOrderAt, locale) : (isFr ? "Aucun achat" : "No purchase")}</span></span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-terre" />
                </span>

                <span className="xl:hidden">
                  <span className="flex min-w-0 items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-terre text-[10px] font-black text-white">{customerInitials(customer.name)}</span><span className="min-w-0 flex-1"><span className="flex min-w-0 flex-wrap items-center gap-2"><strong className="truncate text-xs text-charcoal">{customer.name}</strong><Badge variant="outline" className={`text-[8px] ${segment.className}`}>{segment.label}</Badge></span><span className="mt-1 block truncate text-[9px] text-muted-foreground">{customer.email}</span></span><ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" /></span>
                  <span className="mt-3 grid grid-cols-3 divide-x divide-charcoal/8 border-y border-charcoal/8 py-2.5 text-center"><span><span className="block text-[8px] text-muted-foreground">{isFr ? "Valeur" : "Value"}</span><strong className="mt-1 block truncate text-[11px] tabular-nums text-charcoal">{formatPrice(customer.lifetimeValue, locale)}</strong></span><span><span className="block text-[8px] text-muted-foreground">{isFr ? "Commandes" : "Orders"}</span><strong className="mt-1 block text-[11px] tabular-nums text-charcoal">{customer.orders}</strong></span><span><span className="block text-[8px] text-muted-foreground">{isFr ? "Dernier achat" : "Last purchase"}</span><strong className="mt-1 block truncate text-[9px] text-charcoal">{customer.lastOrderAt ? formatDate(customer.lastOrderAt, locale) : "—"}</strong></span></span>
                  <span className="mt-2.5 flex items-center justify-between gap-3 text-[9px]"><span className="flex min-w-0 items-center gap-1 truncate text-muted-foreground"><MapPin className="h-3 w-3 shrink-0" />{customer.city}, {customer.country}</span><strong className="shrink-0 text-terre">{action ? customerActionCopy(action, locale).title : segment.move}</strong></span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <aside className="self-start border-y border-charcoal/8 bg-white xl:sticky xl:top-4" aria-labelledby="customer-actions-title">
        <div className="flex items-start justify-between gap-3 border-b border-charcoal/8 px-4 py-3"><div><p className="text-[9px] font-black uppercase text-terre">{isFr ? "File relationnelle" : "Relationship queue"}</p><h3 id="customer-actions-title" className="mt-1 text-sm font-black text-charcoal">{isFr ? "Prochaines attentions" : "Next attentions"}</h3></div><span className="grid h-7 min-w-7 place-items-center rounded bg-terre/[0.08] px-1.5 text-[10px] font-black text-terre">{visibleActions.length}</span></div>
        {visibleActions.length ? <div className="divide-y divide-charcoal/8">{visibleActions.slice(0, 5).map((action) => { const customer = customersById.get(action.customerId)!; const copy = customerActionCopy(action, locale); const Icon = action.kind === "support" ? Headphones : action.kind === "reward" ? Crown : action.kind === "complete_profile" ? UserRoundCheck : action.kind === "activate" ? Sparkles : CircleAlert; const tone = action.level === "critical" ? "bg-destructive/[0.07] text-destructive" : action.level === "opportunity" ? "bg-gold/15 text-charcoal" : "bg-terre/[0.08] text-terre"; return <button key={action.id} type="button" onClick={() => onSelect(customer)} className="group flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-terre/[0.025]"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${tone}`}><Icon className="h-3.5 w-3.5" /></span><span className="min-w-0 flex-1"><strong className="block truncate text-[11px] text-charcoal">{action.customerName}</strong><span className="mt-0.5 block text-[9px] font-bold text-terre">{copy.title}</span><span className="mt-1 block text-[8px] text-muted-foreground">{copy.detail}</span></span><ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" /></button>; })}</div> : <div className="px-5 py-10 text-center"><UserRoundCheck className="mx-auto h-5 w-5 text-burgundy" /><p className="mt-2 text-xs font-black text-charcoal">{isFr ? "File à jour" : "Queue up to date"}</p><p className="mt-1 text-[9px] text-muted-foreground">{isFr ? "Aucune attention relationnelle ouverte." : "No open relationship attention."}</p></div>}
      </aside>
    </div>
  );
}
