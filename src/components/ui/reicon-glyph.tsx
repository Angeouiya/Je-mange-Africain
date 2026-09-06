import type { CSSProperties, HTMLAttributes } from "react";
import type { IconFunction, IconWeight } from "reicon/createIcon";
import { cn } from "@/lib/utils";

type ReiconGlyphProps = Omit<HTMLAttributes<HTMLSpanElement>, "children" | "dangerouslySetInnerHTML"> & {
  icon: IconFunction;
  size?: number | string;
  weight?: IconWeight;
  title?: string;
};

type ReiconGlyphStyle = CSSProperties & { "--reicon-size"?: string };

export function ReiconGlyph({ icon, size = 22, weight = "Outline", title, className, style, ...props }: ReiconGlyphProps) {
  const resolvedSize = typeof size === "number" ? `${size}px` : size;
  const markup = icon.toSvg({
    size: "100%",
    weight,
    attrs: {
      "aria-hidden": "true",
      focusable: "false",
      style: "display:block;width:100%;height:100%;",
    },
  });

  return (
    <span
      {...props}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      role={title ? "img" : undefined}
      style={{ "--reicon-size": resolvedSize, ...style } as ReiconGlyphStyle}
      className={cn("inline-grid h-[var(--reicon-size)] w-[var(--reicon-size)] shrink-0 place-items-center text-current [&>svg]:block", className)}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
