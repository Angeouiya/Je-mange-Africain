import Image from "next/image";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n";

export function BrandLockup({
  context = "client",
  compact = false,
  size = "default",
  inverse = false,
  responsive = false,
  locale = "fr",
  className,
}: {
  context?: "client" | "admin";
  compact?: boolean;
  size?: "default" | "large";
  inverse?: boolean;
  responsive?: boolean;
  locale?: Locale;
  className?: string;
}) {
  const isLarge = size === "large" && !compact;
  const descriptor = context === "admin"
    ? (locale === "fr" ? "Console professionnelle" : "Professional console")
    : (locale === "fr" ? "Cuisine & épicerie" : "Food & groceries");

  return (
    <span className={cn("inline-flex min-w-0 items-center", isLarge ? "gap-3 sm:gap-4" : "gap-2.5", className)}>
      <span className={cn("grid shrink-0 place-items-center overflow-hidden", compact ? "h-11 w-11" : isLarge ? "h-16 w-16 sm:h-20 sm:w-20" : "h-13 w-13")}>
        <Image src="/brand/logo-mark-burgundy.png" alt="" width={96} height={96} className="h-full w-full object-contain" priority />
      </span>
      <span className={cn("min-w-0 leading-none", responsive && "hidden sm:block")}>
        <span className={cn("block whitespace-nowrap font-brand font-semibold", isLarge ? "text-[1.2rem] sm:text-[1.95rem]" : "text-[1.18rem]", inverse ? "text-white" : "text-charcoal")}>
          Je mange Africain
        </span>
        <span className={cn("mt-1.5 block font-extrabold uppercase", isLarge ? "text-[10px]" : "text-[8px]", inverse ? "text-gold" : "text-terre")}>
          {descriptor}
        </span>
      </span>
    </span>
  );
}
