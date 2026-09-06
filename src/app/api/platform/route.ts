import { readPlatformConfiguration, toPublicPlatformConfiguration } from "@/lib/platform-configuration";
import { jsonWithPublicApiCache } from "@/lib/public-api-cache";

export const dynamic = "force-dynamic";

export async function GET() {
  const { configuration } = await readPlatformConfiguration();
  return jsonWithPublicApiCache({ configuration: toPublicPlatformConfiguration(configuration) }, "storefrontReference");
}
