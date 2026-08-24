"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

/** Product visual with a real photo first and a branded fallback for resilience. */
export function ProductImage({
  src,
  alt = "",
  emoji = "🍲",
  color = "#D65A32",
  className = "",
  size = "md",
  rounded = "rounded-xl",
  priority = false,
}: {
  src?: string | null;
  alt?: string;
  emoji?: string;
  color?: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  rounded?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
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
  const showPhoto = Boolean(src && !failed);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${rounded} ${sizes[size]} ${className}`}
      style={{
        background: `linear-gradient(135deg, ${color}22, ${color}44)`,
      }}
    >
      {showPhoto && (
        <>
          <Image
            src={src!}
            alt={alt}
            fill
            sizes={imageSizes[size]}
            priority={priority}
            className="object-cover transition duration-500 group-hover:scale-[1.04]"
            onError={() => setFailed(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/35 via-transparent to-white/10" />
          <span className="absolute bottom-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-lg shadow-sm backdrop-blur">
            {emoji}
          </span>
        </>
      )}
      <div
        className={`absolute inset-0 ${showPhoto ? "opacity-0" : "opacity-30"}`}
        style={{
          backgroundImage: `radial-gradient(circle, ${color}33 1.5px, transparent 1.5px)`,
          backgroundSize: "18px 18px",
        }}
      />
      {!showPhoto && (
        <motion.span
          className={`relative select-none ${emojiSizes[size]}`}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 18 }}
          style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.15))" }}
        >
          {emoji}
        </motion.span>
      )}
      <div
        className={`absolute -bottom-6 -right-6 h-16 w-16 rounded-full ${showPhoto ? "opacity-0" : "opacity-20"}`}
        style={{ background: color }}
      />
    </div>
  );
}
