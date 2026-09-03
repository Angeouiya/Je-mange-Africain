"use client";

import { useId, type ReactNode } from "react";
import { AlertCircle, LoaderCircle, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  action,
  icon,
  variant = "workspace",
  accent = "#D65A32",
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
  variant?: "command" | "workspace" | "flow" | "control";
  accent?: string;
}) {
  if (variant === "command") {
    return (
      <div data-testid="admin-page-header" data-variant={variant} className="-mx-4 border-y border-white/8 bg-charcoal px-4 py-4 text-white sm:-mx-6 sm:px-6 sm:py-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-5">
          <div className="flex max-w-3xl items-start gap-3 sm:gap-4">
            {icon ? <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-white sm:h-11 sm:w-11" style={{ backgroundColor: accent }}>{icon}</span> : null}
            <div className="min-w-0"><p className="text-[9px] font-extrabold uppercase text-gold sm:text-[10px]">{eyebrow}</p><h2 className="mt-0.5 font-display text-[1.4rem] font-semibold leading-tight sm:mt-1.5 sm:text-4xl">{title}</h2><p className="mt-1 line-clamp-2 max-w-2xl text-[11px] leading-4 text-white/70 sm:mt-2 sm:line-clamp-none sm:text-sm sm:leading-6 sm:text-white/58">{description}</p></div>
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </div>
    );
  }

  if (variant === "flow") {
    return (
      <div data-testid="admin-page-header" data-variant={variant} className="-mx-4 flex flex-col gap-3 border-y border-charcoal/8 bg-white px-4 py-4 sm:-mx-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-5 lg:-mx-8 lg:px-8">
        <div className="flex max-w-3xl items-start gap-3 sm:items-center sm:gap-4">
          {icon ? <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-white sm:h-12 sm:w-12" style={{ backgroundColor: accent }}>{icon}</span> : null}
          <div className="min-w-0"><p className="text-[9px] font-extrabold uppercase sm:text-[10px]" style={{ color: accent }}>{eyebrow}</p><h2 className="mt-0.5 font-display text-[1.35rem] font-semibold leading-tight text-charcoal sm:mt-1 sm:text-3xl">{title}</h2><p className="mt-1 line-clamp-2 max-w-2xl text-[11px] leading-4 text-muted-foreground sm:line-clamp-none sm:text-xs sm:leading-5">{description}</p></div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    );
  }

  if (variant === "control") {
    return (
      <div data-testid="admin-page-header" data-variant={variant} className="flex flex-col gap-3 border-l-[3px] bg-white/55 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:border-l-4 sm:px-5 sm:py-4" style={{ borderLeftColor: accent }}>
        <div className="flex max-w-3xl items-start gap-3">
          {icon ? <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border" style={{ color: accent, borderColor: `${accent}25`, backgroundColor: `${accent}0D` }}>{icon}</span> : null}
          <div className="min-w-0"><p className="text-[9px] font-extrabold uppercase text-muted-foreground">{eyebrow}</p><h2 className="mt-0.5 font-display text-[1.35rem] font-semibold leading-tight text-charcoal sm:mt-1 sm:text-3xl">{title}</h2><p className="mt-1 line-clamp-3 max-w-2xl text-[11px] leading-4 text-muted-foreground sm:mt-1.5 sm:line-clamp-none sm:text-xs sm:leading-5">{description}</p></div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    );
  }

  return (
    <div data-testid="admin-page-header" data-variant={variant} className="flex flex-col gap-3 border-b border-charcoal/8 pb-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:pb-5">
      <div className="flex max-w-3xl items-start gap-3 sm:gap-4">
        {icon ? <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-white sm:h-11 sm:w-11" style={{ backgroundColor: accent }}>{icon}</span> : null}
        <div className="min-w-0">
          <p className="text-[9px] font-extrabold uppercase sm:text-[11px]" style={{ color: accent }}>{eyebrow}</p>
          <h2 className="mt-0.5 font-display text-[1.35rem] font-semibold leading-tight text-charcoal sm:mt-1.5 sm:text-[32px]">{title}</h2>
          <p className="mt-1 line-clamp-2 max-w-2xl text-[11px] leading-4 text-muted-foreground sm:mt-2 sm:line-clamp-none sm:text-sm sm:leading-6">{description}</p>
        </div>
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

export function AdminSearchField({
  value,
  onChange,
  label,
  placeholder,
  resultCount,
  totalCount,
  locale,
  className = "",
  surface = "white",
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
  resultCount: number;
  totalCount: number;
  locale: "fr" | "en";
  className?: string;
  surface?: "white" | "muted";
}) {
  const inputId = useId();
  const statusId = useId();
  const resultLabel = locale === "fr"
    ? `${resultCount} résultat${resultCount === 1 ? "" : "s"} sur ${totalCount}`
    : `${resultCount} result${resultCount === 1 ? "" : "s"} of ${totalCount}`;

  return (
    <div className={`min-w-0 ${className}`} data-testid="admin-search-field">
      <div className="relative">
        <label htmlFor={inputId} className="sr-only">{label}</label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={inputId}
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-describedby={statusId}
          className={`h-10 pl-9 ${value ? "pr-10" : "pr-3"} [&::-webkit-search-cancel-button]:hidden ${surface === "muted" ? "bg-[#F7F7F4]" : "bg-white"}`}
          placeholder={placeholder}
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition hover:bg-charcoal/5 hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terre"
            aria-label={locale === "fr" ? "Effacer la recherche" : "Clear search"}
            title={locale === "fr" ? "Effacer" : "Clear"}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      <p id={statusId} className="mt-1 min-h-4 px-1 text-[9px] font-bold text-muted-foreground" aria-live="polite">
        {resultLabel}
      </p>
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
    <div className="scroll-pretty flex w-full max-w-full gap-1 overflow-x-auto overscroll-x-contain rounded-lg border border-border bg-white p-1 sm:w-fit" role="tablist" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={value === item.value}
          aria-label={typeof item.count === "number" ? `${item.label}, ${item.count}` : item.label}
          onClick={() => onChange(item.value)}
          className={`flex h-9 min-w-max flex-1 shrink-0 items-center justify-center gap-2 rounded-md px-3 text-xs font-bold transition-colors sm:flex-none ${value === item.value ? "bg-charcoal text-white" : "text-muted-foreground hover:bg-muted hover:text-charcoal"}`}
        >
          {item.label}
          {typeof item.count === "number" ? <span aria-hidden="true" className={`grid min-w-5 place-items-center rounded px-1.5 py-0.5 text-[9px] tabular-nums ${value === item.value ? "bg-white/12 text-white" : "bg-muted text-muted-foreground"}`}>{item.count}</span> : null}
        </button>
      ))}
    </div>
  );
}
