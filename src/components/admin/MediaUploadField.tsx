"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, LoaderCircle, Replace, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MediaUploadField({
  value,
  onChange,
  kind,
  locale,
  label,
  aspect = "square",
  required = false,
}: {
  value: string;
  onChange: (url: string, objectPath?: string) => void;
  kind: "product" | "recipe" | "advertisement" | "brand";
  locale: string;
  label: string;
  aspect?: "square" | "landscape";
  required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const upload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("kind", kind);
      const response = await fetch("/api/admin/media", { method: "POST", body: form });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || (locale === "fr" ? "Chargement impossible." : "Upload failed."));
      onChange(payload.asset.publicUrl, payload.asset.objectPath);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (locale === "fr" ? "Chargement impossible." : "Upload failed."));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2"><p className="text-xs font-bold text-charcoal">{label}{required ? <span className="ml-1 text-terre">*</span> : null}</p><span className="text-[9px] uppercase text-muted-foreground">JPG · PNG · WebP · AVIF</span></div>
      <div className={`relative overflow-hidden border border-dashed border-border bg-muted/25 ${aspect === "landscape" ? "aspect-[16/7]" : "aspect-square max-h-64"}`}>
        {value ? <Image src={value} alt="" fill sizes={aspect === "landscape" ? "(max-width: 768px) 100vw, 700px" : "320px"} className="object-cover" /> : <div className="absolute inset-0 grid place-items-center px-6 text-center"><div><ImagePlus className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-2 text-[11px] leading-5 text-muted-foreground">{locale === "fr" ? "Choisissez une photo nette qui permet d'identifier immédiatement le contenu." : "Choose a clear photo that immediately identifies the content."}</p></div></div>}
        {uploading ? <div className="absolute inset-0 grid place-items-center bg-white/85 backdrop-blur-sm"><LoaderCircle className="h-6 w-6 animate-spin text-terre" /></div> : null}
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={(event) => void upload(event.target.files?.[0])} />
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()} className="flex-1">{value ? <Replace className="mr-1.5 h-4 w-4" /> : <ImagePlus className="mr-1.5 h-4 w-4" />}{value ? (locale === "fr" ? "Remplacer" : "Replace") : (locale === "fr" ? "Charger l'image" : "Upload image")}</Button>
        {value ? <Button type="button" variant="ghost" size="icon" onClick={() => onChange("")} className="h-9 w-9 text-destructive" aria-label={locale === "fr" ? "Retirer l'image" : "Remove image"}><Trash2 className="h-4 w-4" /></Button> : null}
      </div>
      {error ? <p role="alert" className="text-[11px] leading-5 text-destructive">{error}</p> : null}
    </div>
  );
}
