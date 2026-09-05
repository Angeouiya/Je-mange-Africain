import { NextResponse } from "next/server";
import { readPlatformConfiguration, toPublicPlatformConfiguration } from "@/lib/platform-configuration";

export const dynamic = "force-dynamic";

export async function GET() {
  const { configuration } = await readPlatformConfiguration();
  return NextResponse.json({ configuration: toPublicPlatformConfiguration(configuration) });
}
