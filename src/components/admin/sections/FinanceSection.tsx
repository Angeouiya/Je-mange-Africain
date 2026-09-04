"use client";

import { useState } from "react";
import { ChartNoAxesCombined, CircleDollarSign, Landmark } from "lucide-react";
import { AdminPageHeader, SectionTabs } from "@/components/admin/AdminPrimitives";
import { FinancePaymentLedger } from "@/components/admin/FinancePaymentLedger";
import { ProfitabilityPanel } from "@/components/admin/ProfitabilityPanel";

type FinanceView = "profitability" | "payments";
type FinanceDestination = "catalog" | "inventory" | "orders";

export default function FinanceSection({ locale, onNavigate }: { locale: "fr" | "en"; onNavigate?: (destination: FinanceDestination) => void }) {
  const isFr = locale === "fr";
  const [view, setView] = useState<FinanceView>("profitability");

  return (
    <div className="space-y-6">
      <AdminPageHeader
        variant="control"
        accent="#8A3042"
        icon={<CircleDollarSign className="h-5 w-5" />}
        eyebrow={isFr ? "Pilotage financier" : "Financial steering"}
        title={isFr ? "Rentabilité et encaissements" : "Profitability and payments"}
        description={isFr ? "Comprenez chaque euro vendu, arbitrez les familles et les lots, puis rapprochez les paiements dans un registre traçable." : "Understand every sales euro, manage families and batches, then reconcile payments in a traceable ledger."}
      />

      <SectionTabs variant="workspace" value={view} onChange={setView} label={isFr ? "Espaces financiers" : "Finance workspaces"} items={[
        { value: "profitability", label: isFr ? "Rentabilité" : "Profitability", description: isFr ? "Coûts, marges et décisions" : "Costs, margins and decisions", icon: ChartNoAxesCombined, accent: "#8A3042" },
        { value: "payments", label: isFr ? "Encaissements" : "Payments", description: isFr ? "Transactions et rapprochements" : "Transactions and reconciliation", icon: Landmark, accent: "#B9472B" },
      ]} />

      {view === "profitability" ? <ProfitabilityPanel locale={locale} onNavigate={onNavigate} /> : <FinancePaymentLedger locale={locale} onNavigate={onNavigate} />}
    </div>
  );
}
