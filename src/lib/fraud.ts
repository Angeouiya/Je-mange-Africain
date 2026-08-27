export interface FraudAssessmentInput {
  total: number;
  itemCount: number;
  uniqueProducts: number;
  email: string;
  phone?: string;
  postalCode?: string;
  recentAttempts?: number;
}

export function assessCheckoutRisk(input: FraudAssessmentInput) {
  const signals: string[] = [];
  let score = 0;

  if (input.total >= 250) { score += 28; signals.push("high_value"); }
  else if (input.total >= 150) { score += 14; signals.push("elevated_value"); }
  if (input.itemCount >= 30) { score += 18; signals.push("large_quantity"); }
  if (input.uniqueProducts === 1 && input.itemCount >= 10) { score += 15; signals.push("concentrated_cart"); }
  if (!input.phone) { score += 8; signals.push("missing_phone"); }
  if (!input.postalCode) { score += 10; signals.push("missing_postal_code"); }
  if (!input.email.includes("@")) { score += 25; signals.push("invalid_email"); }
  if ((input.recentAttempts || 0) >= 4) { score += 24; signals.push("payment_velocity"); }

  score = Math.min(100, score);
  return {
    score,
    level: score >= 60 ? "high" : score >= 30 ? "medium" : "low",
    requiresReview: score >= 60,
    signals,
  } as const;
}
