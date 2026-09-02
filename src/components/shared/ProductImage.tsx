"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

/** Product visual with a real photo first and a branded fallback for resilience. */
export function ProductImage({
  src,
  fallbackSrc = "/hero-feast-v2.webp",
  alt = "",
  emoji = "🍲",
  color = "#D65A32",
  className = "",
  size = "md",
  rounded = "rounded-xl",
  priority = false,
}: {
  src?: string | null;
  fallbackSrc?: string | null;
  alt?: string;
  emoji?: string;
  color?: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  rounded?: string;
  priority?: boolean;
}) {
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const sizes: Record<string, string> = {
    sm: "h-16 w-16",
    md: "h-32 w-32",
    lg: "h-48 w-48",
    xl: "h-64 w-64",
  };
  const imageSizes: Record<string, string> = {
    sm: "64px",
    md: "160px",
    lg: "(max-width: 768px) 50vw, 260px",
    xl: "(max-width: 1024px) 100vw, 560px",
  };
  const emojiSizes: Record<string, string> = {
    sm: "text-3xl",
    md: "text-5xl",
    lg: "text-7xl",
    xl: "text-8xl",
  };
  const activeSource = [src, fallbackSrc].find((candidate): candidate is string => Boolean(candidate && !failedSources.includes(candidate)));
  const showPhoto = Boolean(activeSource);

  useEffect(() => {
    setFailedSources([]);
  }, [fallbackSrc, src]);

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${rounded} ${sizes[size]} ${className}`}
      style={{
        background: `color-mix(in srgb, ${color} 18%, white)`,
      }}
    >
      {showPhoto && (
        <>
          <Image
            src={activeSource!}
            alt={alt}
            fill
            sizes={imageSizes[size]}
            priority={priority}
            className="object-cover transition duration-500 group-hover:scale-[1.04]"
            onError={() => setFailedSources((current) => activeSource && !current.includes(activeSource) ? [...current, activeSource] : current)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/35 via-transparent to-white/10" />
        </>
      )}
      {!showPhoto && (
        <motion.span
          className={`relative select-none ${emojiSizes[size]}`}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 18 }}
          style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.15))" }}
        >
          {emoji || "🍲"}
        </motion.span>
      )}
    </div>
  );
}
