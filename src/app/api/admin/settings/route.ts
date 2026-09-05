import { NextRequest, NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import {
  PLATFORM_CONFIGURATION_ID,
  PlatformConfigurationInput,
  platformIntegrationStatus,
  readPlatformConfiguration,
} from "@/lib/platform-configuration";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request, { module: "settings", action: "read" });
  if (!authorization.ok) return authorization.response;

  const current = await readPlatformConfiguration();
  return NextResponse.json({
    configuration: current.configuration,
    metadata: { persisted: current.persisted, updatedBy: current.updatedBy, updatedAt: current.updatedAt },
    integrations: platformIntegrationStatus(current.databaseAvailable),
  });
}

export async function PATCH(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request, { module: "settings", action: "update" });
  if (!authorization.ok) return authorization.response;

  const parsed = PlatformConfigurationInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "La configuration de service est incomplète ou invalide.", details: parsed.error.flatten() }, { status: 400 });
  }

  const previous = await readPlatformConfiguration();
  if (!previous.databaseAvailable) {
    return NextResponse.json({ error: "La base de configuration n'est pas encore disponible." }, { status: 503 });
  }

  try {
    const updated = await db.$transaction(async (transaction) => {
      const configuration = await transaction.platformConfiguration.upsert({
        where: { id: PLATFORM_CONFIGURATION_ID },
        create: { id: PLATFORM_CONFIGURATION_ID, ...parsed.data, updatedBy: authorization.user.email },
        update: { ...parsed.data, updatedBy: authorization.user.email },
      });
      await transaction.auditLog.create({
        data: {
          action: "platform_configuration_update",
          entityType: "PlatformConfiguration",
          entityId: PLATFORM_CONFIGURATION_ID,
          before: JSON.stringify(previous.configuration),
          after: JSON.stringify(parsed.data),
          reason: `Configuration mise à jour par ${authorization.user.email}`,
        },
      });
      return configuration;
    });

    return NextResponse.json({
      configuration: PlatformConfigurationInput.parse(updated),
      metadata: { persisted: true, updatedBy: updated.updatedBy, updatedAt: updated.updatedAt.toISOString() },
      integrations: platformIntegrationStatus(true),
    });
  } catch {
    return NextResponse.json({ error: "La configuration n'a pas pu être enregistrée." }, { status: 503 });
  }
}
