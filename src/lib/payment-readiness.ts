import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { paymentMethodFamily, type PaymentMethodFamily } from "@/lib/payment-methods";

const AUDITED_PAYMENT_METHODS = [
  "card",
  "paypal",
  "apple_pay",
  "google_pay",
  "link",
  "klarna",
  "ideal",
  "bancontact",
  "eps",
  "p24",
  "mobilepay",
  "swish",
  "twint",
  "revolut_pay",
] as const;

export type AuditedPaymentMethod = (typeof AUDITED_PAYMENT_METHODS)[number];

export type PaymentReadinessMethod = {
  method: AuditedPaymentMethod;
  family: PaymentMethodFamily;
  available: boolean;
  role: "essential" | "express" | "local";
  markets: string[];
};

export type PaymentProviderReadiness = {
  provider: "Stripe";
  state: "ready" | "attention" | "unconfigured" | "unavailable";
  reachable: boolean;
  liveMode: boolean | null;
  configurationName: string | null;
  isDefault: boolean;
  checkedAt: string;
  card: boolean;
  paypal: boolean;
  methods: PaymentReadinessMethod[];
};

type ConfigurationSnapshot = Pick<Stripe.PaymentMethodConfiguration, "active" | "is_default" | "livemode" | "name">
  & Partial<Record<AuditedPaymentMethod, { available: boolean }>>;

const METHOD_ROLE: Record<AuditedPaymentMethod, PaymentReadinessMethod["role"]> = {
  card: "essential",
  paypal: "essential",
  apple_pay: "express",
  google_pay: "express",
  link: "express",
  klarna: "express",
  ideal: "local",
  bancontact: "local",
  eps: "local",
  p24: "local",
  mobilepay: "local",
  swish: "local",
  twint: "local",
  revolut_pay: "express",
};

const METHOD_MARKETS: Record<AuditedPaymentMethod, string[]> = {
  card: ["EU"],
  paypal: ["EU"],
  apple_pay: ["DEVICE"],
  google_pay: ["DEVICE"],
  link: ["EU"],
  klarna: ["ELIGIBLE"],
  ideal: ["NL"],
  bancontact: ["BE"],
  eps: ["AT"],
  p24: ["PL"],
  mobilepay: ["DK", "FI"],
  swish: ["SE"],
  twint: ["CH"],
  revolut_pay: ["EU"],
};

export function projectPaymentReadiness(configuration: ConfigurationSnapshot | null, checkedAt = new Date().toISOString()): PaymentProviderReadiness {
  const methods = AUDITED_PAYMENT_METHODS.map((method) => ({
    method,
    family: paymentMethodFamily(method),
    available: Boolean(configuration?.[method]?.available),
    role: METHOD_ROLE[method],
    markets: METHOD_MARKETS[method],
  }));
  const card = methods.find((method) => method.method === "card")?.available || false;
  const paypal = methods.find((method) => method.method === "paypal")?.available || false;

  return {
    provider: "Stripe",
    state: configuration && card && paypal ? "ready" : "attention",
    reachable: Boolean(configuration),
    liveMode: configuration?.livemode ?? null,
    configurationName: configuration?.name || null,
    isDefault: Boolean(configuration?.is_default),
    checkedAt,
    card,
    paypal,
    methods,
  };
}

export async function readPaymentReadiness(): Promise<PaymentProviderReadiness> {
  const checkedAt = new Date().toISOString();
  if (!stripe) return { ...projectPaymentReadiness(null, checkedAt), state: "unconfigured" };

  try {
    const configurations = await stripe.paymentMethodConfigurations.list({ active: true, limit: 100 });
    const selected = configurations.data.find((configuration) => configuration.is_default) || configurations.data[0] || null;
    return projectPaymentReadiness(selected as ConfigurationSnapshot | null, checkedAt);
  } catch {
    return { ...projectPaymentReadiness(null, checkedAt), state: "unavailable" };
  }
}
