export const BRAND_COLORS = {
  earth: "#B9472B",
  terracotta: "#D65A32",
  deepEarth: "#A73E22",
  gold: "#F2A900",
  burgundy: "#8A3042",
  chilli: "#C92A3E",
  warmCoral: "#E66A3A",
  charcoal: "#3F2930",
  cream: "#FFF9F2",
} as const;

export const BRAND_ACCENT_COLORS = [
  BRAND_COLORS.earth,
  BRAND_COLORS.terracotta,
  BRAND_COLORS.deepEarth,
  BRAND_COLORS.gold,
  BRAND_COLORS.burgundy,
  BRAND_COLORS.chilli,
  BRAND_COLORS.warmCoral,
] as const;

export function getReadableBrandAccent(color: string) {
  return color === BRAND_COLORS.gold || color === BRAND_COLORS.terracotta || color === BRAND_COLORS.warmCoral
    ? BRAND_COLORS.deepEarth
    : color;
}

export function getBrandAccentForeground(color: string) {
  return color === BRAND_COLORS.gold ? BRAND_COLORS.charcoal : BRAND_COLORS.cream;
}
