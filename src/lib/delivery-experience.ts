export type DeliveryWindow = {
  minDelayHours: number;
  maxDelayHours: number;
};

export function formatEstimatedArrival(
  window: DeliveryWindow | null | undefined,
  locale: "fr" | "en",
  from = new Date(),
) {
  if (!window?.minDelayHours || !window.maxDelayHours) {
    return locale === "fr" ? "Délai en cours de calcul" : "Delivery window being calculated";
  }

  const minimum = new Date(from.getTime() + window.minDelayHours * 3_600_000);
  const maximum = new Date(from.getTime() + window.maxDelayHours * 3_600_000);
  const formatter = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Europe/Paris",
  });
  const minimumLabel = formatter.format(minimum);
  const maximumLabel = formatter.format(maximum);

  if (minimumLabel === maximumLabel) return minimumLabel;
  return locale === "fr"
    ? `Entre ${minimumLabel} et ${maximumLabel}`
    : `Between ${minimumLabel} and ${maximumLabel}`;
}
