import { Boxes, ChefHat, CircleDollarSign, ClipboardList, Fingerprint, LayoutDashboard, Megaphone, PackageSearch, ShieldCheck, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { actionLabel, moduleLabel } from "@/components/admin/team-labels";
import type { TeamPermissionMap } from "@/components/admin/team-types";
import { ADMIN_MODULES, type AdminAction, type AdminModule } from "@/lib/admin-permissions";

export function TeamPermissionList({ permissions, locale, includeEmpty = false }: { permissions: TeamPermissionMap; locale: "fr" | "en"; includeEmpty?: boolean }) {
  const modules = includeEmpty ? ADMIN_MODULES : ADMIN_MODULES.filter((module) => permissions[module]?.length);
  return <div className="divide-y divide-border border-y border-border">{modules.map((module) => {
    const actions = permissions[module] || [];
    return <div key={module} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3"><div className="flex min-w-0 items-center gap-3"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-md ${actions.length ? "bg-forest/[0.07] text-forest" : "bg-muted text-muted-foreground"}`}><ModuleGlyph module={module} /></span><div className="min-w-0"><p className="break-words text-xs font-black leading-4 text-charcoal">{moduleLabel(module, locale)}</p><p className="mt-0.5 text-[9px] text-muted-foreground">{actions.length ? (locale === "fr" ? `${actions.length} autorisation${actions.length === 1 ? "" : "s"}` : `${actions.length} permission${actions.length === 1 ? "" : "s"}`) : (locale === "fr" ? "Aucun accès" : "No access")}</p></div></div><div className="flex max-w-[8rem] flex-wrap justify-end gap-1">{actions.map((action) => <PermissionBadge key={action} action={action} locale={locale} />)}</div></div>;
  })}</div>;
}

export function PermissionBadge({ action, locale }: { action: AdminAction; locale: "fr" | "en" }) {
  const style = action === "delete" ? "border-destructive/25 bg-destructive/[0.04] text-destructive" : action === "update" ? "border-terre/25 bg-terre/[0.04] text-terre-dark" : action === "create" ? "border-gold/45 bg-gold/[0.10] text-charcoal" : "border-forest/20 bg-forest/[0.035] text-forest";
  return <Badge variant="outline" className={`h-5 text-[8px] ${style}`}>{actionLabel(action, locale)}</Badge>;
}

export function ModuleGlyph({ module }: { module: AdminModule }) {
  const className = "h-4 w-4";
  if (module === "dashboard") return <LayoutDashboard className={className} />;
  if (module === "catalog") return <PackageSearch className={className} />;
  if (module === "recipes") return <ChefHat className={className} />;
  if (module === "orders") return <ClipboardList className={className} />;
  if (module === "stock") return <Boxes className={className} />;
  if (module === "customers") return <UsersRound className={className} />;
  if (module === "marketing") return <Megaphone className={className} />;
  if (module === "finance") return <CircleDollarSign className={className} />;
  if (module === "audit") return <Fingerprint className={className} />;
  return <ShieldCheck className={className} />;
}
