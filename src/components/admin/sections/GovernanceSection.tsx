"use client";

import { useState } from "react";
import { Database, Fingerprint, History } from "lucide-react";
import { AdminPageHeader, SectionTabs } from "@/components/admin/AdminPrimitives";
import { AuditControlCenter } from "@/components/admin/AuditControlCenter";
import { GovernanceReferenceWorkspace } from "@/components/admin/GovernanceReferenceWorkspace";

type GovernanceTab = "audit" | "workspace";

export default function GovernanceSection({ locale, adminEmail, adminRole }: { locale: "fr" | "en"; adminEmail: string; adminRole: string }) {
  const isFr = locale === "fr";
  const [tab, setTab] = useState<GovernanceTab>("audit");
  return <div className="space-y-6">
    <AdminPageHeader
      variant="control"
      accent="#A73E22"
      icon={<Fingerprint className="h-5 w-5" />}
      eyebrow={isFr ? "Conformité et référentiels" : "Compliance and reference data"}
      title={isFr ? "Gouverner sans ambiguïté" : "Govern without ambiguity"}
      description={isFr ? "Qualifiez chaque action, retrouvez son acteur et comparez son état avant/après, puis contrôlez les référentiels qui structurent l'exploitation." : "Qualify every action, identify its actor and compare its before/after state, then control the reference data structuring operations."}
      signals={[
        { label: isFr ? "Journal" : "Log", value: isFr ? "preuves" : "evidence", icon: <History className="h-3.5 w-3.5" />, tone: "earth" },
        { label: isFr ? "Référentiels" : "References", value: isFr ? "structurés" : "structured", icon: <Database className="h-3.5 w-3.5" />, tone: "burgundy" },
        { label: isFr ? "Rôle" : "Role", value: adminRole ? adminRole.replaceAll("_", " ") : (isFr ? "session" : "session"), icon: <Fingerprint className="h-3.5 w-3.5" />, tone: "gold" },
      ]}
      signalsMobile={false}
    />
    <SectionTabs variant="workspace" value={tab} onChange={setTab} label={isFr ? "Espaces de gouvernance" : "Governance spaces"} items={[
      { value: "audit", label: isFr ? "Journal d'activité" : "Activity log", description: isFr ? "Acteurs, actions et preuves" : "Actors, actions and evidence", icon: History, accent: "#A73E22" },
      { value: "workspace", label: isFr ? "Référentiels" : "Reference data", description: isFr ? "Pays, marques et catégories" : "Countries, brands and categories", icon: Database, accent: "#8A3042" },
    ]} />
    {tab === "audit" ? <AuditControlCenter locale={locale} /> : <GovernanceReferenceWorkspace locale={locale} adminEmail={adminEmail} adminRole={adminRole} />}
  </div>;
}
