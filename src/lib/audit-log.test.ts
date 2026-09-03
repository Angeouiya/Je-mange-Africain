import { describe, expect, it } from "vitest";
import { auditChanges, auditCompleteness, auditDomain, auditRisk, resolveAuditActor } from "@/lib/audit-log";

describe("audit log evidence", () => {
  it("classifies destructive events as critical", () => {
    expect(auditRisk("team_member_delete")).toBe("critical");
    expect(auditRisk("batch_status_change", JSON.stringify({ status: "recalled" }))).toBe("critical");
    expect(auditRisk("price_change")).toBe("attention");
    expect(auditRisk("session_read")).toBe("routine");
  });

  it("routes events to their operating domain", () => {
    expect(auditDomain("batch_create", "InventoryBatch")).toBe("stock");
    expect(auditDomain("team_invite", "AdminMembership")).toBe("access");
    expect(auditDomain("customer_note_update", "Customer")).toBe("customers");
    expect(auditDomain("payment_capture", "Payment")).toBe("finance");
  });

  it("recovers the actor from existing reasons when no user relation exists", () => {
    expect(resolveAuditActor(null, "Mise à jour par direction@je-mange-africain.com")).toEqual({ actor: "direction@je-mange-africain.com", source: "reason" });
    expect(resolveAuditActor("Aminata Koné", null)).toEqual({ actor: "Aminata Koné", source: "identity" });
    expect(resolveAuditActor(null, "Traitement automatique")).toEqual({ actor: null, source: "system" });
  });

  it("builds a concise redacted before-and-after diff", () => {
    const changes = auditChanges(
      JSON.stringify({ price: 4.5, password: "old-secret", status: "draft", integration: { token: "nested-old-secret", endpoint: "https://example.test" } }),
      JSON.stringify({ price: 4.9, password: "new-secret", status: "published", featured: true, integration: { token: "nested-new-secret", endpoint: "https://example.test" } }),
    );

    expect(changes).toEqual(expect.arrayContaining([
      { field: "price", before: "4.5", after: "4.9", kind: "changed" },
      { field: "password", before: "[masqué]", after: "[masqué]", kind: "changed" },
      { field: "featured", before: null, after: "true", kind: "added" },
    ]));
    expect(changes.find((change) => change.field === "integration")?.after).toContain('"token":"[masqué]"');
    expect(JSON.stringify(changes)).not.toContain("nested-new-secret");
  });

  it("measures evidence completeness without claiming tamper resistance", () => {
    expect(auditCompleteness({ actorSource: "identity", reason: "Contrôle qualité", entityId: "batch-1", after: "{}", ip: "192.0.2.1" })).toBe(100);
    expect(auditCompleteness({ actorSource: "system", entityId: "batch-1" })).toBe(15);
  });
});
