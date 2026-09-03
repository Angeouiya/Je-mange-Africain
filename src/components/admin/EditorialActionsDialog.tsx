"use client";

import { useState } from "react";
import { Archive, LoaderCircle, MoreHorizontal, Save, Trash2 } from "lucide-react";
import { MediaUploadField } from "@/components/admin/MediaUploadField";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";

type EditorialEntity = {
  id: string;
  title: string;
  imageUrl?: string | null;
  galleryUrls?: string[];
  status?: string;
  isNew?: boolean;
  isRecommended?: boolean;
  isPopular?: boolean;
  isBestseller?: boolean;
};

export function EditorialActionsDialog({ kind, entity, locale, onUpdated }: { kind: "product" | "recipe"; entity: EditorialEntity; locale: "fr" | "en"; onUpdated: () => void }) {
  const isFr = locale === "fr";
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(() => ({
    imageUrl: entity.imageUrl || "",
    galleryUrls: entity.galleryUrls || [],
    status: entity.status || "published",
    isNew: Boolean(entity.isNew),
    isRecommended: Boolean(entity.isRecommended),
    isPopular: Boolean(entity.isPopular),
    isBestseller: Boolean(entity.isBestseller),
  }));

  const reset = () => setDraft({ imageUrl: entity.imageUrl || "", galleryUrls: entity.galleryUrls || [], status: entity.status || "published", isNew: Boolean(entity.isNew), isRecommended: Boolean(entity.isRecommended), isPopular: Boolean(entity.isPopular), isBestseller: Boolean(entity.isBestseller) });
  const endpoint = `/api/admin/${kind === "product" ? "products" : "recipes"}/${entity.id}`;

  const save = async () => {
    if (!draft.imageUrl) return setError(isFr ? "Une photo principale est obligatoire." : "A main photo is required.");
    setSaving(true);
    setError("");
    try {
      const body = kind === "product"
        ? { imageUrl: draft.imageUrl, galleryUrls: draft.galleryUrls, status: draft.status, isNew: draft.isNew, isRecommended: draft.isRecommended, isBestseller: draft.isBestseller }
        : { imageUrl: draft.imageUrl, galleryUrls: draft.galleryUrls, status: draft.status, isNew: draft.isNew, isRecommended: draft.isRecommended, isPopular: draft.isPopular };
      const response = await fetch(endpoint, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || (isFr ? "Mise à jour impossible." : "Update failed."));
      setOpen(false);
      onUpdated();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (isFr ? "Mise à jour impossible." : "Update failed."));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    setError("");
    try {
      const response = await fetch(endpoint, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || (isFr ? "Suppression impossible." : "Deletion failed."));
      setConfirmDelete(false);
      setOpen(false);
      onUpdated();
    } catch (cause) {
      setConfirmDelete(false);
      setError(cause instanceof Error ? cause.message : (isFr ? "Suppression impossible." : "Deletion failed."));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(nextOpen) => { if (saving || deleting) return; setOpen(nextOpen); if (nextOpen) { reset(); setError(""); } }}>
        <DialogTrigger asChild><Button type="button" variant="outline" size="icon" className="h-8 w-8 bg-white/95" aria-label={isFr ? `Gérer ${entity.title}` : `Manage ${entity.title}`} title={isFr ? "Gérer le contenu" : "Manage content"}><MoreHorizontal className="h-4 w-4" /></Button></DialogTrigger>
        <DialogContent className="max-h-[92dvh] overflow-y-auto p-0 sm:max-w-2xl">
          <DialogHeader className="border-b border-border px-5 py-5 sm:px-6"><DialogTitle>{isFr ? "Piloter la publication" : "Manage publishing"}</DialogTitle><DialogDescription>{entity.title}</DialogDescription></DialogHeader>
          <div className="grid gap-5 px-5 py-5 sm:grid-cols-[1fr_0.85fr] sm:px-6">
            <MediaUploadField value={draft.imageUrl} onChange={(imageUrl) => setDraft((current) => ({ ...current, imageUrl }))} kind={kind} locale={locale} label={isFr ? "Photo principale" : "Main photo"} aspect="landscape" required />
            <div className="space-y-4">
              <div className="space-y-2"><Label htmlFor={`${kind}-${entity.id}-status`}>{isFr ? "Visibilité" : "Visibility"}</Label><select id={`${kind}-${entity.id}-status`} value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="published">{isFr ? "Publié" : "Published"}</option><option value="draft">{isFr ? "Brouillon" : "Draft"}</option><option value="archived">{isFr ? "Désactivé" : "Disabled"}</option></select></div>
              <div className="divide-y divide-border border-y border-border">
                <Flag checked={draft.isNew} onChange={(isNew) => setDraft((current) => ({ ...current, isNew }))} label={isFr ? "Marquer comme nouveauté" : "Mark as new"} />
                <Flag checked={draft.isRecommended} onChange={(isRecommended) => setDraft((current) => ({ ...current, isRecommended }))} label={isFr ? "Marquer comme recommandé" : "Mark as recommended"} />
                <Flag checked={kind === "product" ? draft.isBestseller : draft.isPopular} onChange={(checked) => setDraft((current) => kind === "product" ? { ...current, isBestseller: checked } : { ...current, isPopular: checked })} label={isFr ? "Marquer comme populaire" : "Mark as popular"} />
              </div>
              <div className="border-l-2 border-gold bg-gold/[0.09] px-3 py-2 text-[10px] leading-5 text-charcoal"><Archive className="mr-1 inline h-3.5 w-3.5 text-terre" />{isFr ? "Désactiver retire le contenu de la boutique tout en conservant son historique." : "Disabling removes the content from the store while preserving its history."}</div>
              <Button type="button" variant="ghost" onClick={() => setConfirmDelete(true)} className="w-full justify-start text-destructive hover:bg-destructive/[0.06] hover:text-destructive"><Trash2 className="mr-2 h-4 w-4" />{isFr ? "Supprimer définitivement" : "Delete permanently"}</Button>
            </div>
          </div>
          {error ? <p role="alert" className="mx-5 border-y border-destructive/25 bg-destructive/[0.06] px-3 py-2 text-xs leading-5 text-destructive sm:mx-6">{error}</p> : null}
          <DialogFooter className="border-t border-border px-5 py-4 sm:px-6"><Button type="button" variant="outline" onClick={() => setOpen(false)}>{isFr ? "Annuler" : "Cancel"}</Button><Button type="button" onClick={() => void save()} disabled={saving || !draft.imageUrl} className="bg-forest text-white hover:bg-forest-dark">{saving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{isFr ? "Enregistrer" : "Save"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{isFr ? "Supprimer ce contenu définitivement ?" : "Delete this content permanently?"}</AlertDialogTitle><AlertDialogDescription>{isFr ? "Cette action retire la fiche et ses données éditoriales. Elle sera refusée si le contenu est nécessaire à la traçabilité d'une recette, d'un lot ou d'une commande." : "This removes the record and its editorial data. It will be refused when the content is required for recipe, batch or order traceability."}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{isFr ? "Conserver" : "Keep"}</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); void remove(); }} disabled={deleting} className="bg-destructive text-white hover:bg-destructive/90">{deleting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}{isFr ? "Supprimer" : "Delete"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Flag({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return <label className="flex min-h-11 cursor-pointer items-center gap-3 py-2 text-xs font-bold text-charcoal"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-terre" />{label}</label>;
}
