"use client";

import { useState } from "react";
import {
  ArrowRight,
  CalendarClock,
  Camera,
  CheckCircle2,
  ClipboardSignature,
  LoaderCircle,
  LockKeyhole,
  PackagePlus,
  Save,
  ShieldCheck,
  Truck,
} from "lucide-react";
import type { AdminOrder } from "@/components/admin/admin-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  FULFILLMENT_TARGETS,
  fulfillmentStatusLabel,
  nextFulfillmentStatus,
  type FulfillmentStatus,
} from "@/lib/admin-order-fulfillment";

type ShipmentForm = {
  thermalClass: "AMBIANT" | "REFRIGERATED" | "FROZEN";
  carrier: string;
  trackingNumber: string;
  estimatedDelivery: string;
  confirmCode: string;
  proofPhoto: string;
  signature: string;
};

type LogisticsResponse = {
  updatedShipmentId: string | null;
  order: Pick<AdminOrder, "status" | "notes" | "shipments" | "timeline">;
};

const consequences: Record<FulfillmentStatus, { fr: string; en: string }> = {
  preparing: { fr: "L'équipe de préparation devient responsable de la commande.", en: "The fulfilment team becomes responsible for this order." },
  packed: { fr: "Tous les articles sont déclarés emballés et prêts au contrôle.", en: "All items are declared packed and ready for quality control." },
  controlDone: { fr: "Le contrôle des quantités, températures et emballages est déclaré terminé.", en: "Quantity, temperature and packaging checks are declared complete." },
  shipped: { fr: "La commande est remise au transporteur. Tous les colis doivent avoir un suivi.", en: "The order is handed to the carrier. Every parcel must have tracking." },
  in_transit: { fr: "Le client verra que ses colis circulent dans le réseau du transporteur.", en: "The customer will see that their parcels are moving through the carrier network." },
  out_for_delivery: { fr: "La tournée finale commence. Un code de remise est obligatoire pour chaque colis.", en: "Final delivery begins. A handover code is required for every parcel." },
  delivered: { fr: "La commande sera clôturée comme livrée. Une photo ou une signature est obligatoire par colis.", en: "The order will close as delivered. A photo or signature is required for every parcel." },
};

function localDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function shipmentForm(shipment?: AdminOrder["shipments"][number]): ShipmentForm {
  return {
    thermalClass: (shipment?.thermalClass as ShipmentForm["thermalClass"]) || "AMBIANT",
    carrier: shipment?.carrier || "",
    trackingNumber: shipment?.trackingNumber || "",
    estimatedDelivery: localDateTime(shipment?.estimatedDelivery),
    confirmCode: shipment?.confirmCode || "",
    proofPhoto: shipment?.proofPhoto || "",
    signature: shipment?.signature || "",
  };
}

function currentStatusLabel(status: string, locale: "fr" | "en") {
  const labels: Record<string, { fr: string; en: string }> = {
    paymentConfirmed: { fr: "Paiement confirmé", en: "Payment confirmed" },
    stockReserved: { fr: "Stock réservé", en: "Stock reserved" },
    fraudCheck: { fr: "Contrôle validé", en: "Fraud check cleared" },
    preparing: { fr: "En préparation", en: "Preparing" },
    packed: { fr: "Colis prêt", en: "Packed" },
    controlDone: { fr: "Contrôle terminé", en: "Quality checked" },
    shipped: { fr: "Expédiée", en: "Shipped" },
    in_transit: { fr: "En transit", en: "In transit" },
    out_for_delivery: { fr: "En livraison", en: "Out for delivery" },
    delivering: { fr: "En livraison", en: "Delivering" },
    delivered: { fr: "Livrée", en: "Delivered" },
  };
  return labels[status]?.[locale] || status;
}

export function OrderFulfillmentControl({
  order,
  locale,
  canUpdate,
  onUpdated,
}: {
  order: AdminOrder;
  locale: "fr" | "en";
  canUpdate: boolean;
  onUpdated: (order: AdminOrder) => void;
}) {
  const isFr = locale === "fr";
  const initialShipment = order.shipments[0];
  const [shipmentId, setShipmentId] = useState(initialShipment?.id || "new");
  const [form, setForm] = useState<ShipmentForm>(() => shipmentForm(initialShipment));
  const [notes, setNotes] = useState(order.notes || "");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const nextStatus = nextFulfillmentStatus(order.status);
  const progressIndex = FULFILLMENT_TARGETS.indexOf(order.status as FulfillmentStatus);
  const isDelivered = order.status === "delivered";
  const isClosedWithoutDelivery = ["cancelled", "failed", "refunded"].includes(order.status);
  const nextStageTitle = nextStatus
    ? (isFr ? "Prochaine étape contrôlée" : "Next controlled stage")
    : isDelivered
      ? (isFr ? "Flux opérationnel terminé" : "Operational workflow complete")
      : isClosedWithoutDelivery
        ? (isFr ? "Commande clôturée hors livraison" : "Order closed without delivery")
        : (isFr ? "Prérequis externe attendu" : "External prerequisite pending");
  const nextStageCopy = nextStatus
    ? fulfillmentStatusLabel(nextStatus, locale)
    : isDelivered
      ? (isFr ? "La remise et sa preuve sont enregistrées." : "Handover and delivery proof are recorded.")
      : isClosedWithoutDelivery
        ? (isFr ? "Aucun avancement logistique n'est autorisé." : "No logistics advancement is allowed.")
        : (isFr ? "Le paiement ou la vérification client doit être résolu avant la préparation." : "Payment or customer review must clear before preparation.");

  const selectShipment = (id: string) => {
    setShipmentId(id);
    setForm(shipmentForm(order.shipments.find((shipment) => shipment.id === id)));
    setResult(null);
  };

  const updateField = <Key extends keyof ShipmentForm>(key: Key, value: ShipmentForm[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const save = async (status?: FulfillmentStatus) => {
    setSaving(true);
    setResult(null);
    try {
      const response = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          ...(status ? { status } : {}),
          notes,
          shipment: {
            ...(shipmentId !== "new" ? { id: shipmentId } : {}),
            ...form,
            estimatedDelivery: form.estimatedDelivery ? new Date(form.estimatedDelivery).toISOString() : "",
          },
        }),
      });
      const payload = await response.json() as LogisticsResponse & { error?: string };
      if (!response.ok) throw new Error(payload.error || (isFr ? "Mise à jour impossible." : "Update failed."));
      const updatedOrder = { ...order, ...payload.order };
      onUpdated(updatedOrder);
      if (payload.updatedShipmentId) setShipmentId(payload.updatedShipmentId);
      setResult({
        type: "success",
        message: status
          ? (isFr ? `La commande est maintenant « ${fulfillmentStatusLabel(status, "fr")} ».` : `The order is now “${fulfillmentStatusLabel(status, "en")}”.`)
          : (isFr ? "La fiche logistique est enregistrée." : "The logistics record has been saved."),
      });
    } catch (error) {
      setResult({ type: "error", message: error instanceof Error ? error.message : (isFr ? "Mise à jour impossible." : "Update failed.") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="border-t border-border" aria-labelledby={`fulfillment-${order.id}`}>
      <div className="bg-charcoal px-5 py-5 text-white sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-white/10 text-gold"><Truck className="h-5 w-5" /></span>
            <div>
              <p className="text-[9px] font-black uppercase text-gold">{isFr ? "Poste d'orchestration" : "Fulfilment control"}</p>
              <h3 id={`fulfillment-${order.id}`} className="mt-1 text-sm font-black">{isFr ? "Préparer, tracer et remettre" : "Prepare, trace and hand over"}</h3>
              <p className="mt-1 max-w-2xl text-[11px] leading-5 text-white/65">{isFr ? "Chaque avancement est séquentiel, horodaté et ajouté au journal d'audit." : "Every advancement is sequential, timestamped and added to the audit log."}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-bold">
            <span className="text-white/55">{isFr ? "État" : "State"}</span>
            <ArrowRight className="h-3.5 w-3.5 text-gold" />
            <span>{currentStatusLabel(order.status, locale)}</span>
          </div>
        </div>
        <ol className="mt-5 grid grid-cols-7 gap-1" aria-label={isFr ? "Chaîne de traitement" : "Fulfilment chain"}>
          {FULFILLMENT_TARGETS.map((status, index) => (
            <li key={status} className="min-w-0">
              <span className={`block h-1 rounded-sm ${index <= progressIndex ? "bg-gold" : "bg-white/12"}`} />
              <span className={`mt-1.5 hidden truncate text-[8px] font-bold lg:block ${index <= progressIndex ? "text-white" : "text-white/65"}`}>{fulfillmentStatusLabel(status, locale)}</span>
            </li>
          ))}
        </ol>
      </div>

      {!canUpdate ? (
        <div className="flex items-start gap-3 bg-muted/45 px-5 py-4 text-xs text-muted-foreground sm:px-6"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" /><p>{isFr ? "Votre rôle permet de consulter ce flux, mais pas de modifier la logistique ni l'état de la commande." : "Your role can review this workflow but cannot change logistics or order status."}</p></div>
      ) : (
        <div className="px-5 py-6 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h4 className="text-xs font-black uppercase text-muted-foreground">{isFr ? "Colis et transport" : "Parcel and carrier"}</h4><p className="mt-1 text-[10px] text-muted-foreground">{isFr ? "Renseignez chaque colis séparément, notamment pour les températures différentes." : "Record each parcel separately, especially across temperature classes."}</p></div>
            <label className="min-w-[12rem] text-[10px] font-bold text-muted-foreground">
              {isFr ? "Colis actif" : "Active parcel"}
              <select value={shipmentId} onChange={(event) => selectShipment(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-white px-3 text-xs font-bold text-charcoal">
                {order.shipments.map((shipment, index) => <option key={shipment.id} value={shipment.id}>{isFr ? "Colis" : "Parcel"} {index + 1} · {shipment.trackingNumber || shipment.thermalClass}</option>)}
                <option value="new">+ {isFr ? "Nouveau colis" : "New parcel"}</option>
              </select>
            </label>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2"><Label htmlFor={`thermal-${order.id}`}>{isFr ? "Conservation" : "Temperature class"}</Label><select id={`thermal-${order.id}`} value={form.thermalClass} onChange={(event) => updateField("thermalClass", event.target.value as ShipmentForm["thermalClass"])} className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm"><option value="AMBIANT">{isFr ? "Ambiant" : "Ambient"}</option><option value="REFRIGERATED">{isFr ? "Réfrigéré" : "Refrigerated"}</option><option value="FROZEN">{isFr ? "Surgelé" : "Frozen"}</option></select></div>
            <div className="space-y-2"><Label htmlFor={`carrier-${order.id}`}>{isFr ? "Transporteur" : "Carrier"}</Label><Input id={`carrier-${order.id}`} value={form.carrier} onChange={(event) => updateField("carrier", event.target.value)} placeholder="Chrono Frais" maxLength={100} /></div>
            <div className="space-y-2"><Label htmlFor={`tracking-${order.id}`}>{isFr ? "Numéro de suivi" : "Tracking number"}</Label><Input id={`tracking-${order.id}`} value={form.trackingNumber} onChange={(event) => updateField("trackingNumber", event.target.value)} placeholder="JMA-FR-260902" maxLength={120} /></div>
            <div className="space-y-2"><Label htmlFor={`eta-${order.id}`}><CalendarClock className="mr-1.5 inline h-3.5 w-3.5" />{isFr ? "Livraison estimée" : "Estimated delivery"}</Label><Input id={`eta-${order.id}`} type="datetime-local" value={form.estimatedDelivery} onChange={(event) => updateField("estimatedDelivery", event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor={`code-${order.id}`}><ShieldCheck className="mr-1.5 inline h-3.5 w-3.5" />{isFr ? "Code de remise" : "Handover code"}</Label><Input id={`code-${order.id}`} value={form.confirmCode} onChange={(event) => updateField("confirmCode", event.target.value.replace(/[^A-Za-z0-9-]/g, "").slice(0, 16))} placeholder="4821" inputMode="numeric" /></div>
            <div className="space-y-2"><Label htmlFor={`signature-${order.id}`}><ClipboardSignature className="mr-1.5 inline h-3.5 w-3.5" />{isFr ? "Signataire" : "Signed by"}</Label><Input id={`signature-${order.id}`} value={form.signature} onChange={(event) => updateField("signature", event.target.value)} placeholder={isFr ? "Nom du destinataire" : "Recipient name"} maxLength={120} /></div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-3"><Label htmlFor={`proof-${order.id}`}><Camera className="mr-1.5 inline h-3.5 w-3.5" />{isFr ? "Photo de preuve (URL sécurisée)" : "Proof photo (secure URL)"}</Label><Input id={`proof-${order.id}`} type="url" value={form.proofPhoto} onChange={(event) => updateField("proofPhoto", event.target.value)} placeholder="https://..." maxLength={1000} /></div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-3"><Label htmlFor={`notes-${order.id}`}>{isFr ? "Notes internes d'exploitation" : "Internal operations notes"}</Label><Textarea id={`notes-${order.id}`} value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-24 resize-y" maxLength={1500} placeholder={isFr ? "Contrôles, consignes de froid, incident ou information utile à l'équipe…" : "Checks, cold-chain instructions, incident or useful team information…"} /><p className="text-right text-[9px] text-muted-foreground">{notes.length}/1500</p></div>
          </div>

          <div className="mt-5 flex flex-col gap-3 border-y border-border bg-muted/35 px-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-white text-terre shadow-sm"><CheckCircle2 className="h-4 w-4" /></span><div><p className="text-xs font-black text-charcoal">{nextStageTitle}</p><p className="mt-1 text-[10px] leading-4 text-muted-foreground">{nextStageCopy}</p></div></div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" disabled={saving} onClick={() => save()} className="h-10"><Save className="mr-2 h-4 w-4" />{isFr ? "Enregistrer la logistique" : "Save logistics"}</Button>
              {nextStatus ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button type="button" disabled={saving} className="h-10 bg-terre text-white hover:bg-terre-dark"><ArrowRight className="mr-2 h-4 w-4" />{isFr ? "Passer à" : "Move to"} {fulfillmentStatusLabel(nextStatus, locale)}</Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>{isFr ? "Confirmer l'avancement de la commande ?" : "Confirm order advancement?"}</AlertDialogTitle><AlertDialogDescription>{consequences[nextStatus][locale]}</AlertDialogDescription></AlertDialogHeader>
                    <div className="flex items-start gap-3 border-y border-border bg-muted/45 px-3 py-3"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-terre" /><div><p className="text-xs font-black text-charcoal">{currentStatusLabel(order.status, locale)} <ArrowRight className="mx-1 inline h-3.5 w-3.5" /> {fulfillmentStatusLabel(nextStatus, locale)}</p><p className="mt-1 text-[10px] leading-4 text-muted-foreground">{isFr ? "Cette action sera horodatée, attribuée à votre compte et visible dans la chronologie client." : "This action will be timestamped, attributed to your account and visible in the customer timeline."}</p></div></div>
                    <AlertDialogFooter><AlertDialogCancel>{isFr ? "Vérifier encore" : "Review again"}</AlertDialogCancel><AlertDialogAction onClick={() => save(nextStatus)} className="bg-terre text-white hover:bg-terre-dark"><ArrowRight className="mr-2 h-4 w-4" />{isFr ? "Confirmer l'étape" : "Confirm stage"}</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null}
            </div>
          </div>

          {result ? <div role={result.type === "error" ? "alert" : "status"} className={`mt-4 flex items-center gap-2 border-y px-3 py-3 text-xs font-bold ${result.type === "success" ? "border-forest/25 bg-forest/5 text-forest" : "border-red-200 bg-red-50 text-red-800"}`}>{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : result.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}{result.message}</div> : null}
          {saving ? <p role="status" className="mt-3 flex items-center gap-2 text-[10px] font-bold text-muted-foreground"><LoaderCircle className="h-3.5 w-3.5 animate-spin" />{isFr ? "Synchronisation de la commande…" : "Synchronising order…"}</p> : null}
        </div>
      )}
    </section>
  );
}
