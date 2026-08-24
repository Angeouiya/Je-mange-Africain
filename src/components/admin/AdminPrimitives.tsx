"use client";

import type { ReactNode } from "react";
import { AlertCircle, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-black/8 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        <p className="text-[11px] font-extrabold uppercase text-terre">{eyebrow}</p>
        <h2 className="mt-1.5 text-2xl font-black text-charcoal sm:text-[28px]">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function AdminSectionLoading({ label = "Chargement de l'espace" }: { label?: string }) {
  return (
    <div className="grid min-h-[45vh] place-items-center" role="status">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <LoaderCircle className="h-4 w-4 animate-spin text-terre" />
        {label}
      </div>
    </div>
  );
}

export function AdminErrorState({ message, onRetry }: { message?: string | null; onRetry?: () => void }) {
  return (
    <div className="mx-auto grid min-h-[45vh] max-w-md place-items-center text-center" role="alert">
      <div>
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-lg bg-destructive/10 text-destructive">
          <AlertCircle className="h-5 w-5" />
        </span>
        <h3 className="mt-4 text-base font-extrabold text-charcoal">Données indisponibles</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{message || "La console n'a pas pu charger ces informations."}</p>
        {onRetry ? <Button variant="outline" size="sm" onClick={onRetry} className="mt-4">Réessayer</Button> : null}
      </div>
    </div>
  );
}

export function AdminEmptyState({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="grid min-h-56 place-items-center border-y border-dashed border-border bg-white/45 px-6 text-center">
      <div>
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-lg bg-charcoal/5 text-muted-foreground">{icon}</span>
        <h3 className="mt-3 text-sm font-extrabold text-charcoal">{title}</h3>
        <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export function SectionTabs<T extends string>({
  value,
  onChange,
  items,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  items: Array<{ value: T; label: string; count?: number }>;
  label: string;
}) {
  return (
    <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-lg border border-border bg-white p-1" role="tablist" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={value === item.value}
          onClick={() => onChange(item.value)}
          className={`flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-xs font-bold transition-colors ${value === item.value ? "bg-charcoal text-white" : "text-muted-foreground hover:bg-muted hover:text-charcoal"}`}
        >
          {item.label}
          {typeof item.count === "number" ? <span className={`tabular-nums ${value === item.value ? "text-white/65" : "text-muted-foreground"}`}>{item.count}</span> : null}
        </button>
      ))}
    </div>
  );
}
