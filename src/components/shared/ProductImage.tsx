"use client";

import { motion } from "framer-motion";

/** Product visual: emoji on a branded gradient. No real photos needed for the demo. */
export function ProductImage({
  emoji = "🍲",
  color = "#D65A32",
  className = "",
  size = "md",
  rounded = "rounded-xl",
}: {
  emoji?: string;
  color?: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  rounded?: string;
}) {
  const sizes: Record<string, string> = {
    sm: "h-16 w-16 text-3xl",
    md: "h-32 w-32 text-5xl",
    lg: "h-48 w-48 text-7xl",
    xl: "h-64 w-64 text-8xl",
  };
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${rounded} ${sizes[size]} ${className}`}
      style={{
        background: `linear-gradient(135deg, ${color}22, ${color}44)`,
      }}
    >
      {/* subtle african dots overlay */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle, ${color}33 1.5px, transparent 1.5px)`,
          backgroundSize: "18px 18px",
        }}
      />
      <motion.span
        className="relative select-none"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
        style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.15))" }}
      >
        {emoji}
      </motion.span>
      <div
        className="absolute -bottom-6 -right-6 h-16 w-16 rounded-full opacity-20"
        style={{ background: color }}
      />
    </div>
  );
}
