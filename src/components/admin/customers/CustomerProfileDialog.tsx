"use client";

import { useState } from "react";
import {
  CalendarDays,
  CircleAlert,
  Clock3,
  Heart,
  Languages,
  MapPin,
  NotebookPen,
  PackageCheck,
  Phone,
  ReceiptText,
  TicketCheck,
  UtensilsCrossed,
  WalletCards,
} from "lucide-react";
import { AdminErrorState, AdminSectionLoading, SectionTabs } from "@/components/admin/AdminPrimitives";
import type { AdminCustomer, AdminCustomerDetail } from "@/components/admin/admin-types";
import { ProductImage } from "@/components/shared/ProductImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatDateTime, formatPrice, orderStatusColor } from "@/lib/format";
import { useFetch } from "@/lib/use-fetch";

type ProfileTab = "overview" | "orders" | "relationship";

const ORDER_LABELS: Record<string, [string, string]> = {
  paymentPending: ["Paiement en attente", "Payment pending"],
  paymentConfirmed: ["Paiement confirmé", "Payment confirmed"],
  fraudCheck: ["Contrôle en cours", "Review in progress"],
  stockReserved: ["Stock réservé", "Stock reserved"],
  validated: ["Validée", "Validated"],
  preparing: ["En préparation", "Preparing"],
  packed: ["Préparée", "Packed"],
  shipped: ["Expédiée", "Shipped"],
  in_transit: ["En transit", "In transit"],
  out_for_delivery: ["En livraison", "Out for delivery"],
  delivered: ["Livrée", "Delivered"],
  cancelled: ["Annulée", "Cancelled"],
  refunded: ["Remboursée", "Refunded"],
};

function initials(name: string) {
  return name.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "CL";
}

function segmentLabel(segment: AdminCustomer["segment"], isFr: boolean) {
  const labels = {
    ambassador: isFr ? "Ambassadeur" : "Ambassador",
    active: isFr ? "Actif" : "Active",
    at_risk: isFr ? "À relancer" : "Re-engage",
    new: isFr ? "À activer" : "To activate",
  };
  return labels[segment];
}

function orderLabel(status: string, isFr: boolean) {
  const pair = ORDER_LABELS[status];
  return pair ? pair[isFr ? 0 : 1] : status.replaceAll("_", " ");
}

function ticketLabel(value: string, isFr: boolean) {
  const labels: Record<string, [string, string]> = {
    open: ["Ouverte", "Open"],
    pending: ["En attente", "Pending"],
    resolved: ["Résolue", "Resolved"],
    closed: ["Fermée", "Closed"],
    high: ["Priorité haute", "High priority"],
    urgent: ["Urgente", "Urgent"],
  };
  return labels[value]?.[isFr ? 0 : 1] || value;
}

function CustomerProfileContent({ summary, locale, canUpdate }: { summary: AdminCustomer; locale: "fr" | "en"; canUpdate: boolean }) {
  const isFr = locale === "fr";
  const { data, loading, error, refetch } = useFetch<AdminCustomerDetail>(`/api/admin/customers/${summary.id}?locale=${locale}`, [summary.id, locale]);
  const [tab, setTab] = useState<ProfileTab>("overview");
  const [draftNotes, setDraftNotes] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const customer = data?.customer || summary;
  const notes = draftNotes ?? data?.customer.notes ?? "";

  async function saveNotes() {
    setSaveState("saving");
    try {
      const response = await fetch(`/api/admin/customers/${summary.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || (isFr ? "Enregistrement impossible." : "Unable to save."));
      setDraftNotes(payload.notes || "");
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  return (
    <>
      <DialogHeader className="border-b border-border bg-white px-4 py-4 pr-14 sm:px-6 sm:py-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-charcoal text-xs font-black text-white sm:h-12 sm:w-12 sm:text-sm">{initials(customer.name)}</span>
          <div className="min-w-0 flex-1 text-left">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <DialogTitle className="min-w-0 truncate text-lg sm:text-xl">{customer.name}</DialogTitle>
              <Badge variant="outline" className={customer.segment === "at_risk" ? "border-destructive/25 bg-destructive/[0.06] text-destructive" : customer.segment === "ambassador" ? "border-gold/35 bg-gold/10 text-charcoal" : "border-border bg-white text-muted-foreground"}>{segmentLabel(customer.segment, isFr)}</Badge>
            </div>
            <DialogDescription className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
              <span className="truncate">{customer.email}</span>
              {customer.phone ? <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{customer.phone}</span> : null}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="min-h-0 overflow-y-auto bg-white">
        {loading ? <AdminSectionLoading label={isFr ? "Construction de la vue client" : "Building customer view"} /> : null}
        {error ? <div className="p-5"><AdminErrorState message={error} onRetry={refetch} /></div> : null}
        {data ? (
          <div>
            <dl className="grid grid-cols-2 divide-x divide-y divide-charcoal/8 border-b border-charcoal/8 lg:grid-cols-4 lg:divide-y-0">
              <div className="min-w-0 p-4 sm:p-5"><dt className="text-[9px] font-extrabold uppercase text-muted-foreground">{isFr ? "Valeur client" : "Lifetime value"}</dt><dd className="mt-1 truncate text-lg font-black tabular-nums text-charcoal">{formatPrice(customer.lifetimeValue, locale)}</dd></div>
              <div className="min-w-0 p-4 sm:p-5"><dt className="text-[9px] font-extrabold uppercase text-muted-foreground">{isFr ? "Panier moyen" : "Average basket"}</dt><dd className="mt-1 truncate text-lg font-black tabular-nums text-charcoal">{formatPrice(customer.averageBasket, locale)}</dd></div>
              <div className="min-w-0 p-4 sm:p-5"><dt className="text-[9px] font-extrabold uppercase text-muted-foreground">{isFr ? "Commandes" : "Orders"}</dt><dd className="mt-1 text-lg font-black tabular-nums text-charcoal">{customer.orders}</dd></div>
              <div className="min-w-0 p-4 sm:p-5"><dt className="text-[9px] font-extrabold uppercase text-muted-foreground">{isFr ? "Dernier achat" : "Last purchase"}</dt><dd className="mt-1 truncate text-sm font-black text-charcoal">{customer.lastOrderAt ? formatDate(customer.lastOrderAt, locale) : "—"}</dd></div>
            </dl>

            <div className="border-b border-charcoal/8 px-4 py-3 sm:px-6">
              <SectionTabs value={tab} onChange={setTab} label={isFr ? "Détail du client" : "Customer detail"} items={[
                { value: "overview", label: isFr ? "Synthèse" : "Overview" },
                { value: "orders", label: isFr ? "Commandes" : "Orders", count: data.recentOrders.length },
                { value: "relationship", label: isFr ? "Relation" : "Relationship", count: data.tickets.filter((ticket) => ["open", "pending"].includes(ticket.status)).length },
              ]} />
            </div>

            {tab === "overview" ? (
              <div role="tabpanel" className="px-4 py-5 sm:px-6">
                <section aria-labelledby="customer-identity-title">
                  <div className="flex items-center justify-between gap-3"><h3 id="customer-identity-title" className="text-sm font-black text-charcoal">{isFr ? "Repères de la relation" : "Relationship markers"}</h3><Badge variant="outline" className="border-forest/20 bg-forest/5 text-forest">{data.metrics.activeOrders} {isFr ? "en cours" : "in progress"}</Badge></div>
                  <dl className="mt-4 grid gap-4 border-y border-charcoal/8 py-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="flex gap-2"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-terre" /><div><dt className="text-[9px] font-extrabold uppercase text-muted-foreground">{isFr ? "Client depuis" : "Customer since"}</dt><dd className="mt-1 text-xs font-bold">{formatDate(customer.joinedAt, locale)}</dd></div></div>
                    <div className="flex gap-2"><Languages className="mt-0.5 h-4 w-4 shrink-0 text-terre" /><div><dt className="text-[9px] font-extrabold uppercase text-muted-foreground">{isFr ? "Langue" : "Language"}</dt><dd className="mt-1 text-xs font-bold uppercase">{customer.preferredLang}</dd></div></div>
                    <div className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-terre" /><div><dt className="text-[9px] font-extrabold uppercase text-muted-foreground">{isFr ? "Zone principale" : "Primary area"}</dt><dd className="mt-1 text-xs font-bold">{customer.city}, {customer.country}</dd></div></div>
                    <div className="flex gap-2"><WalletCards className="mt-0.5 h-4 w-4 shrink-0 text-terre" /><div><dt className="text-[9px] font-extrabold uppercase text-muted-foreground">{isFr ? "Avantages" : "Benefits"}</dt><dd className="mt-1 text-xs font-bold">{customer.loyalty.toLocaleString(isFr ? "fr-FR" : "en-GB")} pts · {formatPrice(customer.walletCredit, locale)}</dd></div></div>
                  </dl>
                </section>

                <section className="mt-6" aria-labelledby="customer-top-products-title">
                  <div className="flex items-center justify-between gap-3"><h3 id="customer-top-products-title" className="text-sm font-black text-charcoal">{isFr ? "Produits les plus achetés" : "Most purchased products"}</h3><span className="text-[10px] font-bold text-muted-foreground">{isFr ? "par quantité" : "by quantity"}</span></div>
                  {data.topProducts.length ? <div className="mt-3 divide-y divide-charcoal/8 border-y border-charcoal/8">{data.topProducts.map((product, index) => <div key={`${product.productId}-${product.name}`} className="flex items-center gap-3 py-3"><span className="w-4 shrink-0 text-center text-[10px] font-black text-muted-foreground">{index + 1}</span><ProductImage src={product.imageUrl} alt={product.name} size="sm" rounded="rounded-md" className="!h-11 !w-11 shrink-0" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-black text-charcoal">{product.name}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{product.quantity} {isFr ? "unités achetées" : "units purchased"}</p></div><p className="shrink-0 text-xs font-black tabular-nums">{formatPrice(product.revenue, locale)}</p></div>)}</div> : <p className="mt-3 border-y border-charcoal/8 py-4 text-xs text-muted-foreground">{isFr ? "Les préférences d’achat apparaîtront après la première commande." : "Purchase preferences will appear after the first order."}</p>}
                </section>

                <section className="mt-6 grid gap-6 lg:grid-cols-2" aria-label={isFr ? "Bibliothèque personnelle" : "Personal library"}>
                  <div><div className="flex items-center gap-2"><Heart className="h-4 w-4 text-terre" /><h3 className="text-sm font-black text-charcoal">{isFr ? "Produits favoris" : "Favorite products"}</h3><span className="text-[10px] font-bold text-muted-foreground">{customer.favorites}</span></div><InterestList empty={isFr ? "Aucun produit favori" : "No favorite products"} items={data.favorites.map((favorite) => ({ id: favorite.id, label: favorite.name, imageUrl: favorite.imageUrl }))} /></div>
                  <div><div className="flex items-center gap-2"><UtensilsCrossed className="h-4 w-4 text-forest" /><h3 className="text-sm font-black text-charcoal">{isFr ? "Recettes enregistrées" : "Saved recipes"}</h3><span className="text-[10px] font-bold text-muted-foreground">{customer.savedRecipes}</span></div><InterestList empty={isFr ? "Aucune recette enregistrée" : "No saved recipes"} items={data.savedRecipes.map((recipe) => ({ id: recipe.id, label: recipe.title, meta: recipe.country, imageUrl: recipe.imageUrl }))} /></div>
                </section>
              </div>
            ) : null}

            {tab === "orders" ? (
              <div role="tabpanel" className="px-4 py-5 sm:px-6">
                <div className="grid grid-cols-3 divide-x divide-charcoal/8 border-y border-charcoal/8 py-4 text-center"><div><PackageCheck className="mx-auto h-4 w-4 text-forest" /><p className="mt-1 text-lg font-black tabular-nums">{data.metrics.completedOrders}</p><p className="text-[9px] text-muted-foreground">{isFr ? "livrées" : "delivered"}</p></div><div><Clock3 className="mx-auto h-4 w-4 text-terre" /><p className="mt-1 text-lg font-black tabular-nums">{data.metrics.activeOrders}</p><p className="text-[9px] text-muted-foreground">{isFr ? "en cours" : "in progress"}</p></div><div><CircleAlert className="mx-auto h-4 w-4 text-destructive" /><p className="mt-1 text-lg font-black tabular-nums">{data.metrics.cancelledOrders}</p><p className="text-[9px] text-muted-foreground">{isFr ? "annulées" : "cancelled"}</p></div></div>
                {data.recentOrders.length ? <div className="mt-4 divide-y divide-charcoal/8 border-b border-charcoal/8">{data.recentOrders.map((order) => <article key={order.id} className="py-4"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-charcoal/5 text-charcoal"><ReceiptText className="h-4 w-4" /></span><div className="min-w-0 flex-1"><div className="flex min-w-0 flex-wrap items-center gap-2"><p className="text-xs font-black text-charcoal">{order.number}</p><Badge variant="outline" className={orderStatusColor(order.status)}>{orderLabel(order.status, isFr)}</Badge></div><p className="mt-1 text-[10px] text-muted-foreground">{formatDateTime(order.createdAt, locale)} · {order.itemCount} {isFr ? "article(s)" : "item(s)"}{order.paymentMethod ? ` · ${order.paymentMethod.replaceAll("_", " ")}` : ""}</p></div><p className="shrink-0 text-sm font-black tabular-nums">{formatPrice(order.total, locale)}</p></div>{order.items.length ? <div className="mt-3 ml-0 flex min-w-0 gap-2 overflow-x-auto sm:ml-[3.25rem]">{order.items.map((item) => <div key={item.id} className="flex min-w-[10rem] max-w-[13rem] items-center gap-2 border-l-2 border-charcoal/8 pl-2"><ProductImage src={item.imageUrl} alt={item.name} size="sm" rounded="rounded-md" className="!h-9 !w-9 shrink-0" /><p className="min-w-0 text-[10px] font-bold leading-4"><span className="line-clamp-2">{item.name}</span><span className="text-muted-foreground">× {item.qty}</span></p></div>)}</div> : null}</article>)}</div> : <p className="mt-5 text-xs text-muted-foreground">{isFr ? "Aucune commande enregistrée." : "No orders recorded."}</p>}
              </div>
            ) : null}

            {tab === "relationship" ? (
              <div role="tabpanel" className="px-4 py-5 sm:px-6">
                <section aria-labelledby="addresses-title"><div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-terre" /><h3 id="addresses-title" className="text-sm font-black text-charcoal">{isFr ? "Adresses de livraison" : "Delivery addresses"}</h3><span className="text-[10px] font-bold text-muted-foreground">{data.addresses.length}</span></div>{data.addresses.length ? <div className="mt-3 divide-y divide-charcoal/8 border-y border-charcoal/8">{data.addresses.map((address) => <div key={address.id} className="flex items-start gap-3 py-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-charcoal/5"><MapPin className="h-4 w-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-black">{address.label}</p>{address.isDefault ? <Badge variant="outline" className="border-forest/20 bg-forest/5 text-forest">{isFr ? "Principale" : "Primary"}</Badge> : null}</div><p className="mt-1 text-[10px] leading-4 text-muted-foreground">{address.recipient} · {address.street}, {address.postalCode} {address.city}, {address.country}{address.phone ? ` · ${address.phone}` : ""}</p></div></div>)}</div> : <p className="mt-3 border-y border-charcoal/8 py-4 text-xs text-muted-foreground">{isFr ? "Aucune adresse enregistrée." : "No saved address."}</p>}</section>

                <section className="mt-6" aria-labelledby="support-title"><div className="flex items-center gap-2"><TicketCheck className="h-4 w-4 text-forest" /><h3 id="support-title" className="text-sm font-black text-charcoal">{isFr ? "Demandes de support" : "Support requests"}</h3><span className="text-[10px] font-bold text-muted-foreground">{data.tickets.length}</span></div>{data.tickets.length ? <div className="mt-3 divide-y divide-charcoal/8 border-y border-charcoal/8">{data.tickets.map((ticket) => <div key={ticket.id} className="flex items-start gap-3 py-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-black">{ticket.number}</p><Badge variant="outline" className={ticket.status === "open" ? "border-gold/40 bg-gold/[0.09] text-charcoal" : "border-border text-muted-foreground"}>{ticketLabel(ticket.status, isFr)}</Badge>{["high", "urgent"].includes(ticket.priority) ? <Badge variant="outline" className="border-destructive/25 bg-destructive/[0.06] text-destructive">{ticketLabel(ticket.priority, isFr)}</Badge> : null}</div><p className="mt-1 text-xs text-charcoal">{ticket.subject}</p><p className="mt-1 text-[10px] text-muted-foreground">{formatDateTime(ticket.updatedAt, locale)}{ticket.assignee ? ` · ${ticket.assignee}` : ""}</p></div></div>)}</div> : <p className="mt-3 border-y border-charcoal/8 py-4 text-xs text-muted-foreground">{isFr ? "Aucune demande de support." : "No support requests."}</p>}</section>

                <section className="mt-6 border-t border-charcoal/8 pt-5" aria-labelledby="notes-title"><div className="flex items-center gap-2"><NotebookPen className="h-4 w-4 text-terre" /><h3 id="notes-title" className="text-sm font-black text-charcoal">{isFr ? "Notes internes" : "Internal notes"}</h3></div><p className="mt-1 text-[10px] leading-4 text-muted-foreground">{isFr ? "Visible uniquement par l’équipe autorisée. Chaque modification est inscrite au journal d’audit." : "Visible only to authorized team members. Every change is recorded in the audit log."}</p><Textarea value={notes} onChange={(event) => { setDraftNotes(event.target.value); setSaveState("idle"); }} disabled={!canUpdate} maxLength={2000} aria-label={isFr ? "Notes internes sur le client" : "Internal customer notes"} placeholder={isFr ? "Contexte utile pour le service client…" : "Useful context for customer service…"} className="mt-3 min-h-28 resize-y bg-white" /><div className="mt-2 flex flex-wrap items-center justify-between gap-3"><span className={`text-[10px] font-bold ${saveState === "error" ? "text-destructive" : saveState === "saved" ? "text-forest" : "text-muted-foreground"}`} role="status">{saveState === "saving" ? (isFr ? "Enregistrement…" : "Saving…") : saveState === "saved" ? (isFr ? "Note enregistrée et auditée" : "Note saved and audited") : saveState === "error" ? (isFr ? "La note n’a pas pu être enregistrée" : "The note could not be saved") : !canUpdate ? (isFr ? "Accès en lecture seule" : "Read-only access") : `${notes.length}/2000`}</span>{canUpdate ? <Button type="button" size="sm" onClick={saveNotes} disabled={saveState === "saving" || saveState === "saved" || notes === data.customer.notes} className="bg-charcoal text-white hover:bg-forest-dark">{isFr ? "Enregistrer la note" : "Save note"}</Button> : null}</div></section>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );
}

function InterestList({ items, empty }: { items: Array<{ id: string; label: string; meta?: string; imageUrl?: string | null }>; empty: string }) {
  if (!items.length) return <p className="mt-3 border-y border-charcoal/8 py-4 text-xs text-muted-foreground">{empty}</p>;
  return <div className="mt-3 divide-y divide-charcoal/8 border-y border-charcoal/8">{items.slice(0, 4).map((item) => <div key={item.id} className="flex items-center gap-3 py-2.5"><ProductImage src={item.imageUrl} alt={item.label} size="sm" rounded="rounded-md" className="!h-10 !w-10 shrink-0" /><div className="min-w-0"><p className="truncate text-xs font-bold text-charcoal">{item.label}</p>{item.meta ? <p className="mt-0.5 text-[10px] text-muted-foreground">{item.meta}</p> : null}</div></div>)}</div>;
}

export function CustomerProfileDialog({ selectedCustomer, onClose, locale, canUpdate }: { selectedCustomer: AdminCustomer | null; onClose: () => void; locale: "fr" | "en"; canUpdate: boolean }) {
  return (
    <Dialog open={Boolean(selectedCustomer)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="h-[calc(100svh-1rem)] max-w-[calc(100%-1rem)] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden bg-white p-0 sm:h-auto sm:max-h-[calc(100vh-3rem)] sm:max-w-4xl">
        {selectedCustomer ? <CustomerProfileContent key={`${selectedCustomer.id}-${locale}`} summary={selectedCustomer} locale={locale} canUpdate={canUpdate} /> : null}
      </DialogContent>
    </Dialog>
  );
}
