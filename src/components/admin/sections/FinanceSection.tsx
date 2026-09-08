"use client";

import { useState } from "react";
import { Bank } from "reicon/icons/Bank";
import { ChartBarTrendUp } from "reicon/icons/ChartBarTrendUp";
import { DollarCircle } from "reicon/icons/DollarCircle";
import { AdminPageHeader, SectionTabs } from "@/components/admin/AdminPrimitives";
import { FinancePaymentLedger } from "@/components/admin/FinancePaymentLedger";
import { ProfitabilityPanel } from "@/components/admin/ProfitabilityPanel";
import { ReiconGlyph } from "@/components/ui/reicon-glyph";

type FinanceView = "profitability" | "payments";
type FinanceDestination = "catalog" | "inventory" | "orders";

export default function FinanceSection({ locale, canUpdate, onNavigate }: { locale: "fr" | "en"; canUpdate: boolean; onNavigate?: (destination: FinanceDestination) => void }) {
  const isFr = locale === "fr";
  const [view, setView] = useState<FinanceView>("profitability");

  return (
    <div className="space-y-4 sm:space-y-6">
      <AdminPageHeader
        variant="control"
        accent="#8A3042"
        icon={<ReiconGlyph icon={DollarCircle} weight="Filled" className="h-5 w-5" />}
        eyebrow={isFr ? "Pilotage financier" : "Financial steering"}
        title={isFr ? "Rentabilité et encaissements" : "Profitability and payments"}
        description={isFr ? "Analysez coûts, marges, familles, lots et encaissements." : "Analyse costs, margins, families, batches and payments."}
        signals={[
          { label: isFr ? "Coût brut" : "Gross cost", value: isFr ? "lots" : "batches", icon: <ReiconGlyph icon={ChartBarTrendUp} weight="Filled" className="h-3.5 w-3.5" />, tone: "burgundy" },
          { label: isFr ? "Encaissements" : "Payments", value: isFr ? "rapprochés" : "reconciled", icon: <ReiconGlyph icon={Bank} weight="Filled" className="h-3.5 w-3.5" />, tone: "earth" },
          { label: isFr ? "Europe" : "Europe", value: isFr ? "multi-moyens" : "multi-method", icon: <ReiconGlyph icon={DollarCircle} weight="Filled" className="h-3.5 w-3.5" />, tone: "gold" },
        ]}
        flow={[
          { label: isFr ? "Décomposer" : "Break down", detail: isFr ? "Brut par lot/famille" : "Cost by batch/family", icon: <ReiconGlyph icon={ChartBarTrendUp} weight="Filled" className="h-3.5 w-3.5" />, tone: "burgundy", active: view === "profitability" },
          { label: isFr ? "Mesurer" : "Measure", detail: isFr ? "Marge nette pilotable" : "Steerable net margin", icon: <ReiconGlyph icon={DollarCircle} weight="Filled" className="h-3.5 w-3.5" />, tone: "earth", active: view === "profitability" },
          { label: isFr ? "Encaisser" : "Collect", detail: isFr ? "Carte, PayPal, wallets" : "Card, PayPal, wallets", icon: <ReiconGlyph icon={Bank} weight="Filled" className="h-3.5 w-3.5" />, tone: "gold", active: view === "payments" },
          { label: isFr ? "Rapprocher" : "Reconcile", detail: isFr ? "Preuve et commande" : "Proof and order", icon: <ReiconGlyph icon={Bank} weight="Filled" className="h-3.5 w-3.5" />, tone: "coral", active: view === "payments" },
        ]}
        flowDensity="compact"
        signalsMobile={false}
      />

      <SectionTabs variant="workspace" value={view} onChange={setView} label={isFr ? "Espaces financiers" : "Finance workspaces"} items={[
        { value: "profitability", label: isFr ? "Rentabilité" : "Profitability", description: isFr ? "Coûts, marges et décisions" : "Costs, margins and decisions", icon: ChartBarTrendUp, accent: "#8A3042" },
        { value: "payments", label: isFr ? "Encaissements" : "Payments", description: isFr ? "Transactions et rapprochements" : "Transactions and reconciliation", icon: Bank, accent: "#B9472B" },
      ]} />

      {view === "profitability" ? <ProfitabilityPanel locale={locale} onNavigate={onNavigate} /> : <FinancePaymentLedger locale={locale} canUpdate={canUpdate} onNavigate={onNavigate} />}
    </div>
  );
}
