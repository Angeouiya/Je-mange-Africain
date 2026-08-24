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
    <span className={cn("inline-flex min-w-0 items-center", isLarge ? "gap-3.5" : "gap-2.5", className)}>
      <span className={cn("grid shrink-0 place-items-center overflow-hidden", compact ? "h-10 w-10" : isLarge ? "h-[4.5rem] w-[4.5rem]" : "h-12 w-12")}>
        <Image src="/brand/logo-mark.png" alt="" width={96} height={96} className="h-full w-full object-contain" priority />
      </span>
      <span className={cn("min-w-0 leading-none", responsive && "hidden sm:block")}>
        <span className={cn("block whitespace-nowrap font-brand font-bold", isLarge ? "text-[1.65rem] sm:text-[1.8rem]" : "text-[1.35rem]", inverse ? "text-cream" : "text-charcoal")}>
          Je mange Africain
        </span>
        <span className={cn("mt-1 block font-bold uppercase tracking-wider", isLarge ? "text-[10px]" : "text-[9px]", inverse ? "text-gold" : "text-terre")}>
          {context === "admin" ? "Console professionnelle" : "Cuisine & épicerie"}
        </span>
      </span>
    </span>
  );
}
