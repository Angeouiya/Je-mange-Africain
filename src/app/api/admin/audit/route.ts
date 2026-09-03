import { NextRequest, NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { auditChanges, auditCompleteness, auditDomain, auditRisk, resolveAuditActor } from "@/lib/audit-log";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type AuditPeriod = "24h" | "7d" | "30d" | "all";

function periodStart(period: AuditPeriod) {
  if (period === "all") return null;
  const days = period === "24h" ? 1 : period === "7d" ? 7 : 30;
  return new Date(Date.now() - days * 86_400_000);
}

export async function GET(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request, { module: "audit", action: "read" });
  if (!authorization.ok) return authorization.response;

  const requestedPeriod = new URL(request.url).searchParams.get("period") as AuditPeriod | null;
  const period: AuditPeriod = ["24h", "7d", "30d", "all"].includes(requestedPeriod || "") ? requestedPeriod as AuditPeriod : "30d";
  const start = periodStart(period);
  const where = start ? { createdAt: { gte: start } } : {};
  const [total, logs] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { user: true },
    }),
  ]);

  const normalized = logs.map((log) => {
    const explicitActor = log.user
      ? `${log.user.firstName || ""} ${log.user.lastName || ""}`.trim() || log.user.email
      : null;
    const actor = resolveAuditActor(explicitActor, log.reason);
    const changes = auditChanges(log.before, log.after);
    return {
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      reason: log.reason,
      actor: actor.actor,
      actorSource: actor.source,
      ip: log.ip,
      createdAt: log.createdAt,
      risk: auditRisk(log.action, log.after),
      domain: auditDomain(log.action, log.entityType),
      changes,
      evidenceScore: auditCompleteness({
        actorSource: actor.source,
        reason: log.reason,
        entityId: log.entityId,
        before: log.before,
        after: log.after,
        ip: log.ip,
      }),
    };
  });

  const riskCounts = { critical: 0, attention: 0, routine: 0 };
  const domainCounts: Record<string, number> = {};
  const actors = new Set<string>();
  let evidenceTotal = 0;
  let networkContext = 0;
  for (const log of normalized) {
    riskCounts[log.risk] += 1;
    domainCounts[log.domain] = (domainCounts[log.domain] || 0) + 1;
    if (log.actor) actors.add(log.actor);
    evidenceTotal += log.evidenceScore;
    if (log.ip) networkContext += 1;
  }

  return NextResponse.json({
    period,
    generatedAt: new Date().toISOString(),
    hasMore: total > normalized.length,
    summary: {
      total,
      loaded: normalized.length,
      actors: actors.size,
      risk: riskCounts,
      domains: domainCounts,
      evidenceRate: normalized.length ? Math.round((evidenceTotal / normalized.length) * 10) / 10 : 0,
      networkRate: normalized.length ? Math.round(((networkContext / normalized.length) * 100) * 10) / 10 : 0,
    },
    logs: normalized,
  });
}
