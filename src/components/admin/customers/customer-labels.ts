import type { AdminCustomer, AdminCustomerPortfolioPayload } from "@/components/admin/admin-types";

export function customerInitials(name: string) {
  return name.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "CL";
}

export function customerSegmentDetails(segment: AdminCustomer["segment"], locale: "fr" | "en") {
  const isFr = locale === "fr";
  return {
    ambassador: { label: isFr ? "Ambassadeur" : "Ambassador", move: isFr ? "Fidéliser" : "Reward", className: "border-gold/40 bg-gold/[0.09] text-charcoal" },
    active: { label: isFr ? "Actif" : "Active", move: isFr ? "Développer" : "Grow", className: "border-forest/20 bg-forest/[0.055] text-forest" },
    at_risk: { label: isFr ? "À relancer" : "Re-engage", move: isFr ? "Réactiver" : "Re-engage", className: "border-destructive/25 bg-destructive/[0.055] text-destructive" },
    new: { label: isFr ? "À activer" : "To activate", move: isFr ? "Activer" : "Activate", className: "border-charcoal/10 bg-white text-muted-foreground" },
  }[segment];
}

export function customerActionCopy(action: AdminCustomerPortfolioPayload["actions"][number], locale: "fr" | "en") {
  const isFr = locale === "fr";
  const copy = {
    support: {
      title: isFr ? "Demande ouverte à résoudre" : "Open request to resolve",
      detail: isFr ? `${action.count} demande${action.count > 1 ? "s" : ""} en attente` : `${action.count} pending request${action.count > 1 ? "s" : ""}`,
    },
    reengage: {
      title: isFr ? "Relation à réactiver" : "Relationship to re-engage",
      detail: isFr ? `${action.daysSinceActivity || 0} jours sans achat` : `${action.daysSinceActivity || 0} days without a purchase`,
    },
    activate: {
      title: isFr ? "Premier achat à déclencher" : "First purchase to activate",
      detail: isFr ? `Inscrit depuis ${action.daysSinceActivity || 0} jours` : `Joined ${action.daysSinceActivity || 0} days ago`,
    },
    complete_profile: {
      title: isFr ? "Coordonnées à compléter" : "Contact details to complete",
      detail: isFr ? "Adresse ou téléphone manquant" : "Address or phone missing",
    },
    reward: {
      title: isFr ? "Ambassadeur à valoriser" : "Ambassador to reward",
      detail: isFr ? `${action.count} commandes fidèles` : `${action.count} loyal orders`,
    },
  };
  return copy[action.kind];
}
