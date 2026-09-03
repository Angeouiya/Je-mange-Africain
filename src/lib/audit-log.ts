export const auditRisks = ["critical", "attention", "routine"] as const;
export const auditDomains = ["access", "stock", "catalog", "fulfillment", "customers", "marketing", "finance", "system"] as const;

export type AuditRisk = (typeof auditRisks)[number];
export type AuditDomain = (typeof auditDomains)[number];
export type AuditActorSource = "identity" | "reason" | "system";
export type AuditChange = {
  field: string;
  before: string | null;
  after: string | null;
  kind: "added" | "removed" | "changed";
};

const EMAIL_PATTERN = /[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+/i;
const SENSITIVE_FIELD = /(password|secret|token|authorization|service.?role|api.?key|private.?key|signature)/i;

export function auditRisk(action: string, after?: string | null): AuditRisk {
  const evidence = `${action} ${after || ""}`.toLowerCase();
  if (/(delete|remove|recall|recalled|refund|cancel|suspend|banned)/.test(evidence)) return "critical";
  if (/(update|change|adjust|status|invite|price|stock|advance|create)/.test(evidence)) return "attention";
  return "routine";
}

export function auditDomain(action: string, entityType: string): AuditDomain {
  const evidence = `${action} ${entityType}`.toLowerCase();
  if (/(team|membership|permission|role|user)/.test(evidence)) return "access";
  if (/(stock|batch|warehouse|inventory)/.test(evidence)) return "stock";
  if (/(product|recipe|category|brand|catalog)/.test(evidence)) return "catalog";
  if (/(order|shipment|delivery|checkout|logistics|fulfillment)/.test(evidence)) return "fulfillment";
  if (/(customer|support|ticket|address)/.test(evidence)) return "customers";
  if (/(advertisement|push|campaign|media|marketing)/.test(evidence)) return "marketing";
  if (/(payment|refund|finance|price)/.test(evidence)) return "finance";
  return "system";
}

export function resolveAuditActor(explicitActor?: string | null, reason?: string | null): { actor: string | null; source: AuditActorSource } {
  const explicit = explicitActor?.trim();
  if (explicit) return { actor: explicit, source: "identity" };
  const email = reason?.match(EMAIL_PATTERN)?.[0];
  if (email) return { actor: email, source: "reason" };
  const attributed = reason?.match(/(?:\bpar\b|\bby\b)\s+([^·,;]+)/i)?.[1]?.trim();
  if (attributed) return { actor: attributed.slice(0, 160), source: "reason" };
  return { actor: null, source: "system" };
}

export function auditChanges(before?: string | null, after?: string | null): AuditChange[] {
  const previous = parseRecord(before);
  const next = parseRecord(after);
  const fields = new Set([...Object.keys(previous), ...Object.keys(next)]);
  const changes: AuditChange[] = [];

  for (const field of fields) {
    const previousValue = previous[field];
    const nextValue = next[field];
    if (JSON.stringify(previousValue) === JSON.stringify(nextValue)) continue;
    changes.push({
      field,
      before: previewValue(field, previousValue),
      after: previewValue(field, nextValue),
      kind: !(field in previous) ? "added" : !(field in next) ? "removed" : "changed",
    });
    if (changes.length === 16) break;
  }

  return changes;
}

export function auditCompleteness(input: { actorSource: AuditActorSource; reason?: string | null; entityId?: string | null; before?: string | null; after?: string | null; ip?: string | null }) {
  let score = 0;
  if (input.actorSource !== "system") score += 30;
  if ((input.reason?.trim().length || 0) >= 5) score += 25;
  if (input.entityId?.trim()) score += 15;
  if (input.before || input.after) score += 20;
  if (input.ip?.trim()) score += 10;
  return score;
}

function parseRecord(value?: string | null): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    return { value: parsed };
  } catch {
    return { value };
  }
}

function previewValue(field: string, value: unknown) {
  if (value === undefined) return null;
  if (SENSITIVE_FIELD.test(field)) return "[masqué]";
  if (value === null) return "null";
  const protectedValue = redactSensitiveFields(value);
  const serialized = typeof protectedValue === "string" ? protectedValue : JSON.stringify(protectedValue);
  return serialized.length > 180 ? `${serialized.slice(0, 177)}...` : serialized;
}

function redactSensitiveFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitiveFields);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, nestedValue]) => [
    key,
    SENSITIVE_FIELD.test(key) ? "[masqué]" : redactSensitiveFields(nestedValue),
  ]));
}
