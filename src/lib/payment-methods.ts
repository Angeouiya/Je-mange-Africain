export type PaymentMethodFamily = "card" | "wallet" | "bank" | "deferred" | "credit" | "other";

type PaymentMethodDefinition = {
  label: [string, string];
  family: PaymentMethodFamily;
  hint: [string, string];
};

const PAYMENT_METHODS: Record<string, PaymentMethodDefinition> = {
  card: { label: ["Carte bancaire", "Payment card"], family: "card", hint: ["Visa, Mastercard et wallets compatibles", "Visa, Mastercard and compatible wallets"] },
  apple_pay: { label: ["Apple Pay", "Apple Pay"], family: "wallet", hint: ["Wallet Apple sécurisé", "Secure Apple wallet"] },
  google_pay: { label: ["Google Pay", "Google Pay"], family: "wallet", hint: ["Wallet Google sécurisé", "Secure Google wallet"] },
  paypal: { label: ["PayPal", "PayPal"], family: "wallet", hint: ["Compte ou solde PayPal", "PayPal account or balance"] },
  link: { label: ["Link", "Link"], family: "wallet", hint: ["Paiement accéléré Stripe", "Stripe accelerated checkout"] },
  klarna: { label: ["Klarna", "Klarna"], family: "deferred", hint: ["Paiement flexible selon éligibilité", "Flexible payment when eligible"] },
  ideal: { label: ["iDEAL", "iDEAL"], family: "bank", hint: ["Paiement bancaire aux Pays-Bas", "Dutch online banking"] },
  bancontact: { label: ["Bancontact", "Bancontact"], family: "bank", hint: ["Paiement bancaire en Belgique", "Belgian bank payment"] },
  sepa_debit: { label: ["Prélèvement SEPA", "SEPA Direct Debit"], family: "bank", hint: ["Compte bancaire européen", "European bank account"] },
  eps: { label: ["EPS", "EPS"], family: "bank", hint: ["Paiement bancaire en Autriche", "Austrian online banking"] },
  p24: { label: ["Przelewy24", "Przelewy24"], family: "bank", hint: ["Paiement bancaire en Pologne", "Polish online banking"] },
  revolut_pay: { label: ["Revolut Pay", "Revolut Pay"], family: "wallet", hint: ["Paiement depuis Revolut", "Pay from Revolut"] },
  amazon_pay: { label: ["Amazon Pay", "Amazon Pay"], family: "wallet", hint: ["Paiement depuis Amazon", "Pay from Amazon"] },
  mobilepay: { label: ["MobilePay", "MobilePay"], family: "wallet", hint: ["Wallet mobile nordique", "Nordic mobile wallet"] },
  swish: { label: ["Swish", "Swish"], family: "wallet", hint: ["Paiement mobile en Suède", "Swedish mobile payment"] },
  twint: { label: ["TWINT", "TWINT"], family: "wallet", hint: ["Paiement mobile en Suisse", "Swiss mobile payment"] },
  alipay: { label: ["Alipay", "Alipay"], family: "wallet", hint: ["Wallet international", "International wallet"] },
  wechat_pay: { label: ["WeChat Pay", "WeChat Pay"], family: "wallet", hint: ["Wallet international", "International wallet"] },
  customer_balance: { label: ["Virement bancaire", "Bank transfer"], family: "bank", hint: ["Virement suivi par référence", "Reference-tracked transfer"] },
  bank_transfer: { label: ["Virement bancaire", "Bank transfer"], family: "bank", hint: ["Virement suivi par référence", "Reference-tracked transfer"] },
  cash: { label: ["Espèces", "Cash"], family: "other", hint: ["Règlement enregistré manuellement", "Manually recorded payment"] },
  gift_card: { label: ["Carte cadeau", "Gift card"], family: "credit", hint: ["Crédit cadeau Je mange Africain", "Je mange Africain gift credit"] },
  store_credit: { label: ["Avoir client", "Store credit"], family: "credit", hint: ["Crédit disponible sur le compte", "Credit available on the account"] },
  unknown: { label: ["Moyen enregistré avec la commande", "Method recorded with the order"], family: "other", hint: ["Moyen à confirmer dans le registre", "Method to confirm in the ledger"] },
};

export function paymentMethodKey(value: unknown) {
  return String(value || "unknown").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function paymentMethodLabel(value: unknown, locale: "fr" | "en") {
  const key = paymentMethodKey(value);
  return PAYMENT_METHODS[key]?.label[locale === "fr" ? 0 : 1] || humanizeMethod(key);
}

export function paymentMethodHint(value: unknown, locale: "fr" | "en") {
  const key = paymentMethodKey(value);
  return PAYMENT_METHODS[key]?.hint[locale === "fr" ? 0 : 1] || (locale === "fr" ? "Moyen sécurisé par le prestataire" : "Provider-secured payment method");
}

export function paymentMethodFamily(value: unknown): PaymentMethodFamily {
  return PAYMENT_METHODS[paymentMethodKey(value)]?.family || "other";
}

export function paymentMethodFamilyLabel(value: unknown, locale: "fr" | "en") {
  const labels: Record<PaymentMethodFamily, [string, string]> = {
    card: ["Carte", "Card"],
    wallet: ["Wallet", "Wallet"],
    bank: ["Banque locale", "Local banking"],
    deferred: ["Paiement flexible", "Flexible payment"],
    credit: ["Crédit client", "Customer credit"],
    other: ["Autre méthode", "Other method"],
  };
  return labels[paymentMethodFamily(value)][locale === "fr" ? 0 : 1];
}

export function uniquePaymentMethods(values: readonly string[]) {
  return [...new Set(values.map(paymentMethodKey))];
}

export function paymentStatusLabel(value: unknown, locale: "fr" | "en") {
  const key = paymentMethodKey(value);
  const labels: Record<string, [string, string]> = {
    captured: ["Capturé", "Captured"],
    authorized: ["Autorisé", "Authorised"],
    pending: ["En attente", "Pending"],
    processing: ["En traitement", "Processing"],
    requires_action: ["Action requise", "Action required"],
    requires_payment_method: ["Moyen de paiement requis", "Payment method required"],
    succeeded: ["Confirmé", "Confirmed"],
    paid: ["Payé", "Paid"],
    refunded: ["Remboursé", "Refunded"],
    failed: ["Échoué", "Failed"],
    cancelled: ["Annulé", "Cancelled"],
    canceled: ["Annulé", "Cancelled"],
  };
  return labels[key]?.[locale === "fr" ? 0 : 1] || humanizeMethod(key);
}

function humanizeMethod(value: string) {
  const text = value.replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
