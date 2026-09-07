"use client";

import { useId, type ComponentType, type KeyboardEvent, type ReactNode } from "react";
import type { IconFunction, IconWeight } from "reicon/createIcon";
import { AlertCircle } from "reicon/icons/AlertCircle";
import { CloudX } from "reicon/icons/CloudX";
import { Refresh } from "reicon/icons/Refresh";
import { Search } from "reicon/icons/Search";
import { X } from "reicon/icons/X";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReiconGlyph } from "@/components/ui/reicon-glyph";
import { PremiumLoadingFrame } from "@/components/shared/PremiumLoadingFrame";
import { getBrandAccentForeground, getReadableBrandAccent } from "@/lib/brand-colors";

type ReactIcon = ComponentType<{ className?: string }>;
type AdminTabIcon = IconFunction | ReactIcon;

function isReiconIcon(icon: AdminTabIcon): icon is IconFunction {
  return typeof (icon as IconFunction).toSvg === "function";
}

function AdminIcon({ icon, className, weight = "Outline" }: { icon: AdminTabIcon; className?: string; weight?: IconWeight }) {
  if (isReiconIcon(icon)) return <ReiconGlyph icon={icon} weight={weight} className={className} />;
  const Icon = icon;
  return <Icon className={className} />;
}

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
  const readableAccent = getReadableBrandAccent(accent);
  const accentForeground = getBrandAccentForeground(accent);

  if (variant === "command") {
    return (
      <div data-testid="admin-page-header" data-variant={variant} className="-mx-4 border-y border-burgundy/10 bg-[linear-gradient(118deg,#8A3042_0%,#B9472B_58%,#D65A32_100%)] px-4 py-4 text-white shadow-[0_24px_60px_-44px_rgba(138,48,66,0.9)] sm:-mx-6 sm:px-6 sm:py-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-5">
          <div className="flex max-w-3xl items-start gap-3 sm:gap-4">
            {icon ? <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md sm:h-11 sm:w-11" style={{ backgroundColor: accent, color: accentForeground }}>{icon}</span> : null}
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
          {icon ? <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md sm:h-12 sm:w-12" style={{ backgroundColor: accent, color: accentForeground }}>{icon}</span> : null}
          <div className="min-w-0"><p className="text-[9px] font-extrabold uppercase sm:text-[10px]" style={{ color: readableAccent }}>{eyebrow}</p><h2 className="mt-0.5 font-display text-[1.35rem] font-semibold leading-tight text-charcoal sm:mt-1 sm:text-3xl">{title}</h2><p data-admin-header-description className="mt-1 max-w-2xl text-[11px] leading-4 text-muted-foreground sm:text-xs sm:leading-5">{description}</p></div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    );
  }

  if (variant === "control") {
    return (
      <div data-testid="admin-page-header" data-variant={variant} className="flex flex-col gap-3 border-l-[3px] bg-white/55 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:border-l-4 sm:px-5 sm:py-4" style={{ borderLeftColor: accent }}>
        <div className="flex max-w-3xl items-start gap-3">
          {icon ? <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border" style={{ color: readableAccent, borderColor: `${accent}25`, backgroundColor: `${accent}0D` }}>{icon}</span> : null}
          <div className="min-w-0"><p className="text-[9px] font-extrabold uppercase text-muted-foreground">{eyebrow}</p><h2 className="mt-0.5 font-display text-[1.35rem] font-semibold leading-tight text-charcoal sm:mt-1 sm:text-3xl">{title}</h2><p className="mt-1 line-clamp-3 max-w-2xl text-[11px] leading-4 text-muted-foreground sm:mt-1.5 sm:line-clamp-none sm:text-xs sm:leading-5">{description}</p></div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    );
  }

  return (
    <div data-testid="admin-page-header" data-variant={variant} className="flex flex-col gap-3 border-b border-charcoal/8 pb-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:pb-5">
      <div className="flex max-w-3xl items-start gap-3 sm:gap-4">
        {icon ? <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md sm:h-11 sm:w-11" style={{ backgroundColor: accent, color: accentForeground }}>{icon}</span> : null}
        <div className="min-w-0">
          <p className="text-[9px] font-extrabold uppercase sm:text-[11px]" style={{ color: readableAccent }}>{eyebrow}</p>
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
    <PremiumLoadingFrame context="admin" density="section" label={label} testId="admin-section-loading" />
  );
}

function readableAdminError(message: string | null | undefined, locale: "fr" | "en") {
  const technicalMessage = !message || /^(HTTP\s+\d{3}|Failed to fetch|Load failed|NetworkError.*)$/i.test(message.trim());
  if (technicalMessage) {
    return locale === "fr"
      ? "Le service métier n'a pas répondu. Aucune donnée ni action n'a été modifiée."
      : "The business service did not respond. No data or action has been changed.";
  }
  return message;
}

export function AdminErrorState({ message, onRetry, locale = "fr", title, compact = false }: { message?: string | null; onRetry?: () => void; locale?: "fr" | "en"; title?: string; compact?: boolean }) {
  const isFr = locale === "fr";
  return (
    <section data-testid="admin-data-unavailable" className={`mx-auto grid max-w-xl place-items-center px-4 text-center ${compact ? "min-h-56" : "min-h-[45vh]"}`} role="alert">
      <div className={`w-full border-y border-burgundy/15 bg-[#FFFCFA] px-5 sm:px-8 ${compact ? "py-6" : "py-9"}`}>
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-lg border border-destructive/15 bg-destructive/[0.06] text-destructive shadow-[0_18px_32px_-28px_rgba(201,42,62,0.86)]">
          <ReiconGlyph icon={AlertCircle} weight="Filled" className="h-5 w-5" />
        </span>
        <p className="mt-4 text-[9px] font-black uppercase text-terre">{isFr ? "Synchronisation professionnelle interrompue" : "Professional synchronisation interrupted"}</p>
        <h3 className="mt-1 font-display text-xl font-semibold text-charcoal">{title || (isFr ? "Cet espace ne peut pas être actualisé" : "This workspace cannot be refreshed")}</h3>
        <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6">{readableAdminError(message, locale)}</p>
        {onRetry ? <Button type="button" variant="outline" size="sm" onClick={onRetry} className="mt-5 border-terre/25 bg-white text-terre hover:bg-terre/[0.05] hover:text-terre"><ReiconGlyph icon={Refresh} className="mr-2 h-4 w-4" />{isFr ? "Relancer la synchronisation" : "Retry synchronisation"}</Button> : null}
      </div>
    </section>
  );
}

export function AdminRefreshNotice({ message, onRetry, locale }: { message?: string | null; onRetry: () => void; locale: "fr" | "en" }) {
  const isFr = locale === "fr";
  return (
    <section data-testid="admin-refresh-notice" role="alert" className="flex flex-col gap-3 border-y border-gold/35 bg-gold/[0.065] px-4 py-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-white text-terre shadow-[0_14px_26px_-22px_rgba(185,71,43,0.72)]"><ReiconGlyph icon={CloudX} weight="Filled" className="h-4 w-4" /></span>
        <div className="min-w-0"><p className="text-xs font-black text-charcoal">{isFr ? "Dernière vue fiable conservée" : "Last reliable view preserved"}</p><p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">{readableAdminError(message, locale)} {isFr ? "Les filtres et données affichés restent en place pendant la reprise." : "Displayed filters and data remain in place while you retry."}</p></div>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={onRetry} className="h-9 shrink-0 border-terre/25 bg-white text-terre hover:bg-terre/[0.05] hover:text-terre"><ReiconGlyph icon={Refresh} className="mr-1.5 h-3.5 w-3.5" />{isFr ? "Actualiser" : "Refresh"}</Button>
    </section>
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
        <ReiconGlyph icon={Search} className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
            <ReiconGlyph icon={X} className="h-3.5 w-3.5" />
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
  variant = "filter",
}: {
  value: T;
  onChange: (value: T) => void;
  items: Array<{ value: T; label: string; count?: number; description?: string; icon?: AdminTabIcon; accent?: string }>;
  label: string;
  variant?: "filter" | "workspace";
}) {
  const moveWithKeyboard = (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let nextIndex = currentIndex;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % items.length;
    else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + items.length) % items.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = items.length - 1;
    else return;

    event.preventDefault();
    onChange(items[nextIndex].value);
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus();
  };

  if (variant === "workspace") {
    const denseWorkspace = items.length > 2;
    return (
      <div
        className="grid w-full overflow-hidden rounded-lg border border-burgundy/12 bg-[#FBF7F5] sm:w-fit sm:min-w-[32rem]"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
        role="tablist"
        aria-orientation="horizontal"
        aria-label={label}
        data-testid="workspace-tabs"
        data-density={denseWorkspace ? "dense" : "regular"}
      >
        {items.map((item, index) => {
          const active = value === item.value;
          const accent = item.accent || "#8A3042";
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={typeof item.count === "number" ? `${item.label}, ${item.count}` : item.label}
              onClick={() => onChange(item.value)}
              onKeyDown={(event) => moveWithKeyboard(event, index)}
              className={`group relative flex min-w-0 transition sm:min-h-[4.75rem] sm:flex-row sm:items-center sm:justify-start sm:gap-2.5 sm:px-4 sm:py-2.5 sm:text-left ${denseWorkspace ? "min-h-[5.25rem] flex-col items-center justify-center gap-1.5 px-1.5 py-2 text-center sm:min-w-[12rem]" : "min-h-[4.75rem] items-center gap-2.5 px-3 py-2.5 text-left sm:min-w-[15rem]"} ${index ? "border-l border-burgundy/10" : ""} ${active ? "bg-white text-charcoal shadow-[0_14px_30px_-26px_rgba(90,38,50,0.75)]" : "text-muted-foreground hover:bg-white/65 hover:text-charcoal"}`}
            >
              {active ? <span className="absolute inset-x-3 top-0 h-[3px] rounded-b-full" style={{ backgroundColor: accent }} aria-hidden="true" /> : null}
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border transition-transform duration-200 group-hover:scale-[1.04]" style={{ backgroundColor: active ? accent : `${accent}0D`, borderColor: active ? accent : `${accent}20`, color: active ? getBrandAccentForeground(accent) : getReadableBrandAccent(accent) }}>
                {item.icon ? <AdminIcon icon={item.icon} weight={active ? "Filled" : "Outline"} className="h-[1.05rem] w-[1.05rem]" /> : <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} />}
              </span>
              <span className={`min-w-0 ${denseWorkspace ? "w-full sm:flex-1" : "flex-1"}`}>
                <span className={`flex min-w-0 items-start gap-1.5 ${denseWorkspace ? "justify-center sm:justify-start" : ""}`}>
                  <span data-tab-label className="line-clamp-2 min-w-0 text-[10px] font-black leading-3.5 sm:text-xs sm:leading-4">{item.label}</span>
                  {typeof item.count === "number" ? <span aria-hidden="true" className={`grid min-w-5 shrink-0 place-items-center rounded px-1.5 py-0.5 text-[8px] font-black tabular-nums ${active ? "bg-burgundy/[0.07] text-burgundy" : "bg-white text-muted-foreground"}`}>{item.count}</span> : null}
                </span>
                {item.description ? <span className={`mt-0.5 line-clamp-2 text-[8px] font-semibold leading-3.5 text-muted-foreground sm:block sm:text-[9px] ${denseWorkspace ? "hidden" : "block"}`}>{item.description}</span> : null}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  const mobileGridClass = items.length <= 1 ? "grid-cols-1" : items.length === 2 ? "grid-cols-2" : items.length === 3 ? "grid-cols-3" : "grid-cols-2";
  return (
    <div className={`grid w-full max-w-full ${mobileGridClass} gap-1 overflow-hidden rounded-lg border border-border bg-white p-1 sm:flex sm:w-fit sm:overflow-x-auto sm:overscroll-x-contain`} role="tablist" aria-label={label} aria-orientation="horizontal" data-testid="section-tabs">
      {items.map((item, index) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={value === item.value}
          aria-label={typeof item.count === "number" ? `${item.label}, ${item.count}` : item.label}
          onClick={() => onChange(item.value)}
          onKeyDown={(event) => moveWithKeyboard(event, index)}
          className={`flex min-h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-center text-[10px] font-bold leading-3.5 transition-colors sm:h-9 sm:min-h-0 sm:min-w-max sm:flex-none sm:shrink-0 sm:gap-2 sm:px-3 sm:py-0 sm:text-xs ${value === item.value ? "bg-burgundy text-white" : "text-muted-foreground hover:bg-muted hover:text-charcoal"}`}
        >
          <span data-tab-label className="line-clamp-2 min-w-0">{item.label}</span>
          {typeof item.count === "number" ? <span aria-hidden="true" className={`grid min-w-5 place-items-center rounded px-1.5 py-0.5 text-[9px] tabular-nums ${value === item.value ? "bg-white/12 text-white" : "bg-muted text-muted-foreground"}`}>{item.count}</span> : null}
        </button>
      ))}
    </div>
  );
}
