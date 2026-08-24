"use client";

import { ArrowLeft } from "lucide-react";
import { useStore, type ViewId, type ViewParams } from "@/lib/store";
import { cn } from "@/lib/utils";

export function PageBackButton({
  fallbackView = "home",
  fallbackParams,
  className,
}: {
  fallbackView?: ViewId;
  fallbackParams?: ViewParams;
  className?: string;
}) {
  const locale = useStore((state) => state.locale);
  const goBack = useStore((state) => state.goBack);

  return (
    <button
      type="button"
      onClick={() => goBack(fallbackView, fallbackParams)}
      className={cn(
        "inline-flex min-h-10 items-center gap-2 rounded-md px-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-terre focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terre/30",
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      {locale === "fr" ? "Retour" : "Back"}
    </button>
  );
}
