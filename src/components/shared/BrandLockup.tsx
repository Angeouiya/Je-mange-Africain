import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandLockup({
  context = "client",
  compact = false,
  size = "default",
  inverse = false,
  responsive = false,
  className,
}: {
  context?: "client" | "admin";
  compact?: boolean;
  size?: "default" | "large";
  inverse?: boolean;
  responsive?: boolean;
  className?: string;
}) {
  const isLarge = size === "large" && !compact;

  return (
    <span className={cn("inline-flex min-w-0 items-center", isLarge ? "gap-4" : "gap-2.5", className)}>
      <span className={cn("grid shrink-0 place-items-center overflow-hidden", compact ? "h-11 w-11" : isLarge ? "h-20 w-20" : "h-13 w-13")}>
        <Image src="/brand/logo-mark.png" alt="" width={96} height={96} className="h-full w-full object-contain" priority />
      </span>
      <span className={cn("min-w-0 leading-none", responsive && "hidden sm:block")}>
        <span className={cn("block whitespace-nowrap font-brand font-semibold", isLarge ? "text-[1.7rem] sm:text-[1.95rem]" : "text-[1.18rem]", inverse ? "text-white" : "text-charcoal")}>
          Je mange Africain
        </span>
        <span className={cn("mt-1.5 block font-extrabold uppercase", isLarge ? "text-[10px]" : "text-[8px]", inverse ? "text-gold" : "text-terre")}>
          {context === "admin" ? "Console professionnelle" : "Cuisine & épicerie"}
        </span>
      </span>
    </span>
  );
}
