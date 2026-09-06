import type { HTMLAttributes } from "react";
import type { IconFunction, IconWeight } from "reicon/createIcon";
import { cn } from "@/lib/utils";

type ReiconGlyphProps = Omit<HTMLAttributes<HTMLSpanElement>, "children" | "dangerouslySetInnerHTML"> & {
  icon: IconFunction;
  size?: number | string;
  weight?: IconWeight;
  title?: string;
};

export function ReiconGlyph({ icon, size = 22, weight = "Outline", title, className, ...props }: ReiconGlyphProps) {
  const markup = icon.toSvg({
    size,
    weight,
    className: "h-full w-full",
    attrs: {
      "aria-hidden": "true",
      focusable: "false",
    },
  });

  return (
    <span
      {...props}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      role={title ? "img" : undefined}
      className={cn("inline-grid shrink-0 place-items-center text-current [&>svg]:block", className)}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
