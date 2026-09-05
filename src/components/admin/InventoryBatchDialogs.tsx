"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Ban,
  Boxes,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  LoaderCircle,
  PackagePlus,
  RotateCcw,
  ShieldAlert,
  SlidersHorizontal,
  Warehouse,
  X,
} from "lucide-react";
import type { InventoryBatch, InventoryProductOption, InventoryWarehouseOption } from "@/components/admin/admin-types";
import { ProductImage } from "@/components/shared/ProductImage";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatDate, formatPrice } from "@/lib/format";

type ReceiptDraft = {
  productId: string;
  warehouseId: string;
  lotNumber: string;
  quantity: string;
  costPrice: string;
  receiptDate: string;
  expiryDate: string;
  status: "active" | "blocked";
  reason: string;
};

type StockDirection = "increase" | "decrease";

const today = () => new Date().toISOString().slice(0, 10);

function draftFor(products: InventoryProductOption[], warehouses: InventoryWarehouseOption[]): ReceiptDraft {
  const product = products[0];
  const warehouse = warehouses.find((item) => !product || item.supports.includes(product.thermalClass)) || warehouses[0];
  return {
    productId: product?.id || "",
    warehouseId: warehouse?.id || "",
    lotNumber: "",
    quantity: "",
    costPrice: "",
    receiptDate: today(),
    expiryDate: "",
    status: "active",
    reason: "",
  };
}

function thermalLabel(value: InventoryProductOption["thermalClass"] | undefined, locale: "fr" | "en") {
  if (value === "FROZEN") return locale === "fr" ? "Surgelé" : "Frozen";
  if (value === "REFRIGERATED") return locale === "fr" ? "Réfrigéré" : "Refrigerated";
  return locale === "fr" ? "Ambiant" : "Ambient";
}

function statusLabel(status: InventoryBatch["status"], locale: "fr" | "en") {
  const labels = {
    active: locale === "fr" ? "Disponible" : "Available",
    blocked: locale === "fr" ? "Bloqué" : "Blocked",
    recalled: locale === "fr" ? "Rappelé" : "Recalled",
    expired: locale === "fr" ? "Expiré" : "Expired",
  };
  return labels[status];
}

export function BatchStatusBadge({ status, locale }: { status: InventoryBatch["status"]; locale: "fr" | "en" }) {
  const tone = status === "active"
    ? "border-burgundy/25 bg-burgundy/[0.05] text-burgundy"
    : status === "blocked"
      ? "border-gold/45 bg-gold/10 text-charcoal"
      : status === "recalled"
        ? "border-destructive/25 bg-destructive/[0.06] text-destructive"
        : "border-charcoal/20 bg-charcoal/[0.06] text-charcoal";
  return <Badge variant="outline" className={`shrink-0 ${tone}`}>{statusLabel(status, locale)}</Badge>;
}

export function BatchReceiptDialog({
  locale,
  products,
  warehouses,
  disabled,
  onCreated,
}: {
  locale: "fr" | "en";
  products: InventoryProductOption[];
  warehouses: InventoryWarehouseOption[];
  disabled?: boolean;
  onCreated: () => void;
}) {
  const isFr = locale === "fr";
  const [open, setOpen] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [draft, setDraft] = useState<ReceiptDraft>(() => draftFor(products, warehouses));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const product = products.find((item) => item.id === draft.productId);
  const warehouse = warehouses.find((item) => item.id === draft.warehouseId);
  const compatibleWarehouses = useMemo(() => warehouses.filter((warehouse) => !product || warehouse.supports.includes(product.thermalClass)), [product, warehouses]);
  const stockValue = Number(draft.quantity || 0) * Number(draft.costPrice || 0);
  const complete = Boolean(draft.productId && draft.warehouseId && draft.lotNumber.trim().length >= 3 && Number(draft.quantity) > 0 && Number(draft.costPrice) >= 0 && draft.receiptDate && draft.reason.trim().length >= 5);
  const initialDraft = draftFor(products, warehouses);
  const draftDirty = (Object.keys(initialDraft) as Array<keyof ReceiptDraft>).some((key) => draft[key] !== initialDraft[key]);

  const update = <Key extends keyof ReceiptDraft>(key: Key, value: ReceiptDraft[Key]) => setDraft((current) => ({ ...current, [key]: value }));
  const handleOpen = (next: boolean) => {
    if (busy) return;
    if (next) {
      setDraft(initialDraft);
      setError("");
      setConfirmationOpen(false);
      setDiscardOpen(false);
      setOpen(true);
      return;
    }
    if (draftDirty) {
      setDiscardOpen(true);
      return;
    }
    setOpen(false);
  };
  const discardDraft = () => {
    setDraft(initialDraft);
    setError("");
    setConfirmationOpen(false);
    setDiscardOpen(false);
    setOpen(false);
  };
  const selectProduct = (productId: string) => {
    const nextProduct = products.find((item) => item.id === productId);
    const nextWarehouse = warehouses.find((warehouse) => nextProduct && warehouse.supports.includes(nextProduct.thermalClass));
    setDraft((current) => ({ ...current, productId, warehouseId: nextWarehouse?.id || "" }));
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!complete || busy) return;
    setConfirmationOpen(true);
  };
  const recordReceipt = async () => {
    if (!complete || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/stock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || (isFr ? "Réception impossible." : "Unable to record receipt."));
      setConfirmationOpen(false);
      setOpen(false);
      onCreated();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (isFr ? "Réception impossible." : "Unable to record receipt."));
      setConfirmationOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogTrigger asChild>
          <Button type="button" size="sm" disabled={disabled || !products.length || !warehouses.length} className="h-10 bg-terre text-white hover:bg-terre-dark">
            <PackagePlus className="mr-1.5 h-4 w-4" />{isFr ? "Réceptionner un lot" : "Receive a batch"}
          </Button>
        </DialogTrigger>
        <DialogContent showCloseButton={false} className="max-h-[calc(100svh-1rem)] overflow-hidden p-0 sm:max-w-2xl">
          <form onSubmit={submit} className="flex max-h-[calc(100svh-1rem)] min-h-0 flex-col">
          <DialogHeader className="shrink-0 border-b border-border px-5 py-5 pr-14 text-left sm:px-6 sm:pr-14">
            <DialogDismiss locale={locale} disabled={busy} />
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-terre text-white"><PackagePlus className="h-5 w-5" /></span>
              <div className="min-w-0"><DialogTitle>{isFr ? "Réceptionner un lot traçable" : "Receive a traceable batch"}</DialogTitle><DialogDescription className="mt-1 line-clamp-2">{isFr ? "Identifiez la marchandise, son emplacement et sa valeur avant de la rendre disponible." : "Identify the goods, their location and value before making them available."}</DialogDescription></div>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
            <section aria-labelledby="receipt-product-title">
              <StepHeading id="receipt-product-title" number="1" title={isFr ? "Produit et destination" : "Product and destination"} />
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label={isFr ? "Produit" : "Product"} required>
                  <select aria-label={isFr ? "Produit réceptionné" : "Received product"} value={draft.productId} onChange={(event) => selectProduct(event.target.value)} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm text-charcoal outline-none focus:border-terre focus:ring-2 focus:ring-terre/20">
                    {products.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.sku}</option>)}
                  </select>
                </Field>
                <Field label={isFr ? "Entrepôt compatible" : "Compatible warehouse"} required>
                  <select aria-label={isFr ? "Entrepôt de réception" : "Receiving warehouse"} value={draft.warehouseId} onChange={(event) => update("warehouseId", event.target.value)} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm text-charcoal outline-none focus:border-terre focus:ring-2 focus:ring-terre/20">
                    {compatibleWarehouses.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.city}</option>)}
                  </select>
                </Field>
              </div>
              {!compatibleWarehouses.length ? <p role="alert" className="mt-3 rounded-md border border-gold/35 bg-gold/[0.08] px-3 py-2 text-xs text-charcoal">{isFr ? "Aucun entrepôt ne dispose de la zone thermique requise pour ce produit." : "No warehouse has the thermal zone required for this product."}</p> : null}
              {product ? <div className="mt-3 flex items-center gap-3 border-y border-charcoal/8 py-3"><ProductImage src={product.imageUrl} alt={product.name} emoji="" color={product.imageColor} size="sm" className="h-12 w-12 shrink-0" rounded="rounded-md" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-charcoal">{product.name}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{product.sku} · {thermalLabel(product.thermalClass, locale)} · {product.stockQty} {isFr ? "unités actuelles" : "current units"}</p></div><span className="grid h-9 w-9 place-items-center rounded-md bg-burgundy/10 text-burgundy"><Warehouse className="h-4 w-4" /></span></div> : null}
            </section>

            <section aria-labelledby="receipt-trace-title">
              <StepHeading id="receipt-trace-title" number="2" title={isFr ? "Identité et calendrier" : "Identity and timeline"} />
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <Field label={isFr ? "Numéro de lot" : "Batch number"} required><Input value={draft.lotNumber} onChange={(event) => update("lotNumber", event.target.value.toUpperCase())} placeholder="ATT-2609-FR" autoComplete="off" className="h-11" /></Field>
                <Field label={isFr ? "Réception" : "Receipt"} required><Input type="date" value={draft.receiptDate} onChange={(event) => update("receiptDate", event.target.value)} className="h-11" /></Field>
                <Field label={isFr ? "Péremption" : "Expiry"}><Input type="date" min={draft.receiptDate} value={draft.expiryDate} onChange={(event) => update("expiryDate", event.target.value)} className="h-11" /></Field>
              </div>
            </section>

            <section aria-labelledby="receipt-value-title">
              <StepHeading id="receipt-value-title" number="3" title={isFr ? "Quantité, valeur et disponibilité" : "Quantity, value and availability"} />
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Field label={isFr ? "Quantité physique" : "Physical quantity"} required><Input type="number" inputMode="numeric" min="1" max="100000" value={draft.quantity} onChange={(event) => update("quantity", event.target.value)} className="h-11" /></Field>
                <Field label={isFr ? "Coût brut unitaire (€)" : "Unit gross cost (€)"} required><Input type="number" inputMode="decimal" min="0" step="0.01" value={draft.costPrice} onChange={(event) => update("costPrice", event.target.value)} className="h-11" /></Field>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1" role="radiogroup" aria-label={isFr ? "Disponibilité initiale" : "Initial availability"}>
                <AvailabilityOption checked={draft.status === "active"} onClick={() => update("status", "active")} label={isFr ? "Disponible" : "Available"} detail={isFr ? "Vente immédiate" : "Sell immediately"} />
                <AvailabilityOption checked={draft.status === "blocked"} onClick={() => update("status", "blocked")} label={isFr ? "Quarantaine" : "Quarantine"} detail={isFr ? "Contrôle requis" : "Review required"} />
              </div>
              <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-4 rounded-lg bg-charcoal px-4 py-3 text-white"><div><p className="text-[9px] font-black uppercase text-gold">{isFr ? "Valeur brute du lot" : "Batch gross value"}</p><p className="mt-1 text-2xl font-black tabular-nums">{formatPrice(stockValue, locale)}</p></div><CircleDollarSign className="h-6 w-6 text-white/55" /></div>
            </section>

            <Field label={isFr ? "Motif ou référence de réception" : "Receipt reason or reference"} required><Input value={draft.reason} onChange={(event) => update("reason", event.target.value)} placeholder={isFr ? "Bon fournisseur, arrivage ou contrôle qualité" : "Supplier note, arrival or quality check"} className="h-11" /></Field>
            {error ? <p role="alert" className="rounded-md border border-destructive/25 bg-destructive/[0.06] px-3 py-2 text-xs text-destructive">{error}</p> : null}
          </div>

          <DialogFooter className="shrink-0 border-t border-border bg-[#FBFBF8] px-5 py-4 sm:px-6">
            <Button type="button" variant="outline" onClick={() => handleOpen(false)} disabled={busy}>{isFr ? "Annuler" : "Cancel"}</Button>
            <Button type="submit" disabled={!complete || busy} className="bg-terre text-white hover:bg-terre-dark">{busy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardCheck className="mr-2 h-4 w-4" />}{isFr ? "Enregistrer la réception" : "Record receipt"}</Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={confirmationOpen} onOpenChange={(next) => { if (!busy) setConfirmationOpen(next); }}>
        <AlertDialogContent>
          <AlertDialogHeader><span className="mb-1 grid h-11 w-11 place-items-center rounded-md bg-terre/[0.08] text-terre"><PackagePlus className="h-5 w-5" /></span><AlertDialogTitle>{draft.status === "active" ? (isFr ? "Rendre ce lot disponible ?" : "Make this batch available?") : (isFr ? "Enregistrer ce lot en quarantaine ?" : "Record this batch in quarantine?")}</AlertDialogTitle><AlertDialogDescription>{isFr ? `${draft.quantity} unité(s) de ${product?.name || "ce produit"} seront ajoutées à ${warehouse?.name || "l'entrepôt sélectionné"} sous le lot ${draft.lotNumber}. La valeur brute enregistrée sera de ${formatPrice(stockValue, locale)}. ${draft.status === "active" ? "Elles entreront immédiatement dans le stock vendable." : "Elles resteront bloquées jusqu'à une décision de contrôle."}` : `${draft.quantity} unit(s) of ${product?.name || "this product"} will be added to ${warehouse?.name || "the selected warehouse"} under batch ${draft.lotNumber}. The recorded gross value will be ${formatPrice(stockValue, locale)}. ${draft.status === "active" ? "They will immediately enter sellable stock." : "They will remain blocked until a review decision is made."}`}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={busy}>{isFr ? "Vérifier le lot" : "Review batch"}</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); void recordReceipt(); }} disabled={busy} className="bg-terre text-white hover:bg-terre-dark">{busy ? <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" /> : <ClipboardCheck className="mr-1.5 h-4 w-4" />}{isFr ? "Confirmer la réception" : "Confirm receipt"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><span className="mb-1 grid h-11 w-11 place-items-center rounded-md bg-destructive/[0.07] text-destructive"><X className="h-5 w-5" /></span><AlertDialogTitle>{isFr ? "Abandonner cette réception ?" : "Discard this receipt?"}</AlertDialogTitle><AlertDialogDescription>{isFr ? "Le numéro de lot, les quantités, la valeur et la référence saisis seront effacés. Aucun stock physique ou vendable ne sera modifié." : "The entered batch number, quantities, value and reference will be cleared. No physical or sellable stock will be changed."}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>{isFr ? "Continuer la réception" : "Keep editing"}</AlertDialogCancel><AlertDialogAction onClick={discardDraft} className="bg-destructive text-white hover:bg-destructive/90"><X className="mr-1.5 h-4 w-4" />{isFr ? "Oui, abandonner" : "Yes, discard"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function BatchControlDialog({ batch, locale, canUpdate, onUpdated }: { batch: InventoryBatch; locale: "fr" | "en"; canUpdate: boolean; onUpdated: () => void }) {
  const isFr = locale === "fr";
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<StockDirection>("increase");
  const [quantity, setQuantity] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const available = Math.max(0, batch.quantity - batch.reserved);
  const locked = batch.status === "recalled" || batch.status === "expired";

  const handleOpen = (next: boolean) => {
    if (busy) return;
    setOpen(next);
    if (next) {
      setError("");
      setMessage("");
      setQuantity("");
      setAdjustmentReason("");
      setStatusReason("");
    }
  };
  const mutate = async (body: Record<string, unknown>, success: string) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/stock/${batch.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || (isFr ? "Mise à jour impossible." : "Update failed."));
      setMessage(success);
      setQuantity("");
      setAdjustmentReason("");
      setStatusReason("");
      onUpdated();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (isFr ? "Mise à jour impossible." : "Update failed."));
    } finally {
      setBusy(false);
    }
  };
  const adjust = (event: FormEvent) => {
    event.preventDefault();
    if (Number(quantity) < 1 || adjustmentReason.trim().length < 5) return;
    void mutate({ action: "adjust", direction, quantity: Number(quantity), reason: adjustmentReason }, isFr ? "Le comptage physique et le stock vendable ont été actualisés." : "Physical and sellable stock have been updated.");
  };
  const changeStatus = (status: InventoryBatch["status"]) => void mutate({ action: "status", status, reason: statusReason }, isFr ? "Le statut du lot et sa disponibilité ont été actualisés." : "Batch status and availability have been updated.");

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild><Button type="button" variant="outline" size="sm" className="h-9 border-charcoal/12 px-3 text-[10px]"><SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />{isFr ? "Gérer" : "Manage"}</Button></DialogTrigger>
      <DialogContent showCloseButton={false} className="flex max-h-[calc(100svh-1rem)] min-h-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0 border-b border-border px-5 py-5 pr-14 text-left sm:px-6 sm:pr-14">
          <DialogDismiss locale={locale} disabled={busy} />
          <div className="flex items-start gap-3"><ProductImage src={batch.productImageUrl} alt={batch.productName} emoji="" color={batch.productImageColor} size="sm" className="h-14 w-14 shrink-0" rounded="rounded-md" /><div className="min-w-0 flex-1"><p className="text-[9px] font-black uppercase text-terre">{isFr ? "Poste de contrôle du lot" : "Batch control desk"}</p><DialogTitle className="mt-1 truncate">{batch.productName}</DialogTitle><div className="mt-1.5 flex flex-wrap items-center gap-2"><DialogDescription>{batch.lotNumber} · {batch.warehouse || "—"}</DialogDescription><BatchStatusBadge status={batch.status} locale={locale} /></div></div></div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
          <section className="grid grid-cols-2 overflow-hidden rounded-lg border border-charcoal/8 bg-white sm:grid-cols-4" aria-label={isFr ? "Mesures du lot" : "Batch metrics"}>
            <BatchMetric label={isFr ? "Physique" : "Physical"} value={String(batch.quantity)} />
            <BatchMetric label={isFr ? "Réservé" : "Reserved"} value={String(batch.reserved)} />
            <BatchMetric label={isFr ? "Disponible" : "Available"} value={String(available)} accent />
            <BatchMetric label={isFr ? "Valeur brute" : "Gross value"} value={formatPrice(batch.quantity * batch.costPrice, locale)} />
          </section>

          <div className="grid gap-3 border-y border-charcoal/8 py-4 text-xs sm:grid-cols-3">
            <BatchFact icon={CalendarClock} label={isFr ? "Reçu le" : "Received"} value={formatDate(batch.receiptDate, locale)} />
            <BatchFact icon={AlertTriangle} label={isFr ? "Péremption" : "Expiry"} value={batch.expiryDate ? formatDate(batch.expiryDate, locale) : (isFr ? "Non renseignée" : "Not provided")} />
            <BatchFact icon={Boxes} label={isFr ? "Chaîne thermique" : "Thermal class"} value={thermalLabel(batch.thermalClass, locale)} />
          </div>

          {canUpdate && !locked ? (
            <form onSubmit={adjust} className="space-y-3" data-testid="stock-adjustment-form">
              <div><p className="text-[10px] font-black uppercase text-muted-foreground">{isFr ? "Comptage physique" : "Physical count"}</p><h3 className="mt-1 text-base font-black text-charcoal">{isFr ? "Ajuster la quantité tracée" : "Adjust tracked quantity"}</h3></div>
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1" role="radiogroup" aria-label={isFr ? "Type d'ajustement" : "Adjustment type"}>
                <DirectionOption checked={direction === "increase"} onClick={() => setDirection("increase")} icon={ArrowUp} label={isFr ? "Entrée" : "Increase"} />
                <DirectionOption checked={direction === "decrease"} onClick={() => setDirection("decrease")} icon={ArrowDown} label={isFr ? "Sortie" : "Decrease"} />
              </div>
              <div className="grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end">
                <Field label={isFr ? "Unités" : "Units"} required><Input aria-label={isFr ? "Quantité d'ajustement" : "Adjustment quantity"} type="number" min="1" max="100000" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="h-11" /></Field>
                <Field label={isFr ? "Motif du mouvement" : "Movement reason"} required><Input value={adjustmentReason} onChange={(event) => setAdjustmentReason(event.target.value)} placeholder={isFr ? "Comptage, casse ou réception complémentaire" : "Count, damage or additional receipt"} className="h-11" /></Field>
                <Button type="submit" disabled={busy || Number(quantity) < 1 || adjustmentReason.trim().length < 5} className="h-11 bg-terre text-white hover:bg-terre-dark">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="mr-1.5 h-4 w-4" />}{isFr ? "Appliquer" : "Apply"}</Button>
              </div>
            </form>
          ) : null}

          {canUpdate ? (
            <section className="space-y-3 border-t border-charcoal/8 pt-5">
              <div><p className="text-[10px] font-black uppercase text-muted-foreground">{isFr ? "Décision sanitaire" : "Safety decision"}</p><h3 className="mt-1 text-base font-black text-charcoal">{isFr ? "Contrôler la mise en vente" : "Control sale availability"}</h3></div>
              {locked ? <div className="flex gap-3 rounded-lg border border-charcoal/12 bg-charcoal/[0.04] p-4 text-xs leading-5 text-charcoal"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /><p>{isFr ? "Ce lot est définitivement verrouillé. Son historique reste consultable pour les contrôles sanitaires et comptables." : "This batch is permanently locked. Its history remains available for safety and accounting checks."}</p></div> : <>
                <Field label={isFr ? "Motif obligatoire de la décision" : "Required decision reason"} required><Input value={statusReason} onChange={(event) => setStatusReason(event.target.value)} placeholder={isFr ? "Contrôle qualité, alerte fournisseur…" : "Quality review, supplier alert…"} className="h-11" /></Field>
                <div className="flex flex-wrap gap-2">
                  {batch.status === "active" ? <StatusDecision status="blocked" label={isFr ? "Bloquer temporairement" : "Temporarily block"} description={isFr ? `Les ${batch.quantity} unités seront retirées de la vente. Les réservations existantes resteront visibles pour traitement.` : `All ${batch.quantity} units will be removed from sale. Existing reservations remain visible for handling.`} reasonReady={statusReason.trim().length >= 5} busy={busy} locale={locale} icon={Ban} onConfirm={() => changeStatus("blocked")} /> : null}
                  {batch.status === "blocked" ? <StatusDecision status="active" label={isFr ? "Remettre en vente" : "Return to sale"} description={isFr ? `Les ${batch.quantity} unités physiques redeviendront disponibles, sous réserve de la date de péremption.` : `All ${batch.quantity} physical units will become available again, subject to the expiry date.`} reasonReady={statusReason.trim().length >= 5} busy={busy} locale={locale} icon={RotateCcw} onConfirm={() => changeStatus("active")} /> : null}
                  <StatusDecision status="recalled" label={isFr ? "Rappeler définitivement" : "Recall permanently"} description={isFr ? "Le rappel est irréversible. Le lot sera exclu de la vente et conservé dans le journal sanitaire." : "A recall is irreversible. The batch will be excluded from sale and retained in the safety log."} reasonReady={statusReason.trim().length >= 5} busy={busy} locale={locale} icon={ShieldAlert} onConfirm={() => changeStatus("recalled")} />
                </div>
              </>}
            </section>
          ) : <div className="flex gap-3 rounded-lg border border-gold/30 bg-gold/[0.08] p-4 text-xs leading-5 text-charcoal"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /><p>{isFr ? "Votre rôle permet la consultation, mais pas la modification du stock." : "Your role allows viewing, but not stock changes."}</p></div>}

          {message ? <p role="status" className="flex items-center gap-2 rounded-md border border-burgundy/20 bg-burgundy/[0.05] px-3 py-2 text-xs font-semibold text-burgundy"><CheckCircle2 className="h-4 w-4 shrink-0" />{message}</p> : null}
          {error ? <p role="alert" className="rounded-md border border-destructive/25 bg-destructive/[0.06] px-3 py-2 text-xs text-destructive">{error}</p> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StepHeading({ id, number, title }: { id: string; number: string; title: string }) {
  return <div className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded bg-terre text-[10px] font-black text-white">{number}</span><h3 id={id} className="text-sm font-black text-charcoal">{title}</h3></div>;
}

function Field({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="block text-xs font-bold text-charcoal">{label}{required ? <span className="ml-1 text-terre">*</span> : null}</span>{children}</label>;
}

function AvailabilityOption({ checked, onClick, label, detail }: { checked: boolean; onClick: () => void; label: string; detail: string }) {
  return <button type="button" role="radio" aria-checked={checked} onClick={onClick} className={`min-h-12 rounded-md px-3 text-left transition ${checked ? "bg-white text-charcoal shadow-sm ring-1 ring-charcoal/8" : "text-muted-foreground"}`}><span className="block text-xs font-black">{label}</span><span className="mt-0.5 block text-[9px]">{detail}</span></button>;
}

function DirectionOption({ checked, onClick, icon: Icon, label }: { checked: boolean; onClick: () => void; icon: typeof ArrowUp; label: string }) {
  return <button type="button" role="radio" aria-checked={checked} onClick={onClick} className={`flex h-10 items-center justify-center gap-2 rounded-md text-xs font-black transition ${checked ? "bg-white text-charcoal shadow-sm ring-1 ring-charcoal/8" : "text-muted-foreground"}`}><Icon className={`h-4 w-4 ${checked ? "text-terre" : ""}`} />{label}</button>;
}

function BatchMetric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div className="min-w-0 border-b border-r border-charcoal/8 p-3 last:border-r-0 sm:border-b-0 sm:p-4"><p className="truncate text-[9px] font-black uppercase text-muted-foreground">{label}</p><p className={`mt-1 truncate text-lg font-black tabular-nums ${accent ? "text-terre" : "text-charcoal"}`}>{value}</p></div>;
}

function BatchFact({ icon: Icon, label, value }: { icon: typeof CalendarClock; label: string; value: string }) {
  return <div className="flex items-start gap-2"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-terre" /><div className="min-w-0"><p className="text-[9px] font-black uppercase text-muted-foreground">{label}</p><p className="mt-0.5 text-xs font-bold text-charcoal">{value}</p></div></div>;
}

function StatusDecision({ status, label, description, reasonReady, busy, locale, icon: Icon, onConfirm }: { status: "active" | "blocked" | "recalled"; label: string; description: string; reasonReady: boolean; busy: boolean; locale: "fr" | "en"; icon: typeof Ban; onConfirm: () => void }) {
  const destructive = status === "recalled";
  return <AlertDialog><AlertDialogTrigger asChild><Button type="button" variant="outline" disabled={!reasonReady || busy} className={destructive ? "border-destructive/25 text-destructive hover:bg-destructive/[0.05]" : "border-charcoal/15 text-charcoal"}><Icon className="mr-1.5 h-4 w-4" />{label}</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><span className={`mb-1 grid h-11 w-11 place-items-center rounded-lg ${destructive ? "bg-destructive/[0.08] text-destructive" : "bg-gold/15 text-charcoal"}`}><Icon className="h-5 w-5" /></span><AlertDialogTitle>{label} ?</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{locale === "fr" ? "Annuler" : "Cancel"}</AlertDialogCancel><AlertDialogAction onClick={onConfirm} className={destructive ? "bg-destructive text-white hover:bg-destructive/90" : "bg-terre text-white hover:bg-terre-dark"}>{locale === "fr" ? "Confirmer la décision" : "Confirm decision"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;
}

function DialogDismiss({ locale, disabled }: { locale: "fr" | "en"; disabled: boolean }) {
  return <DialogClose asChild><button type="button" disabled={disabled} aria-label={locale === "fr" ? "Fermer" : "Close"} title={locale === "fr" ? "Fermer" : "Close"} className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-md border border-charcoal/8 bg-white/90 text-muted-foreground shadow-sm transition hover:bg-white hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terre disabled:opacity-50"><X className="h-4 w-4" /></button></DialogClose>;
}
