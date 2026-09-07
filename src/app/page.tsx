import type { Metadata } from "next";
import { StorefrontApp } from "@/components/storefront/StorefrontApp";
import { storefrontMetadataFromSearchParams, type PublicSearchParams } from "@/lib/public-seo";

type PageProps = {
  searchParams: Promise<PublicSearchParams>;
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  return storefrontMetadataFromSearchParams(await searchParams);
}

export default function Page() {
  return <StorefrontApp />;
}
