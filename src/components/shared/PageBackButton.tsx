"use client";

import { ArrowLeft } from "reicon/icons/ArrowLeft";
import { ReiconGlyph } from "@/components/ui/reicon-glyph";
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
        "inline-flex min-h-10 items-center gap-2 rounded-md border border-transparent px-2.5 text-sm font-bold text-muted-foreground transition-colors hover:border-terre/12 hover:bg-terre/[0.045] hover:text-terre focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terre/30",
        className,
      )}
    >
      <ReiconGlyph icon={ArrowLeft} className="h-4 w-4" />
      {locale === "fr" ? "Retour" : "Back"}
    </button>
  );
}
