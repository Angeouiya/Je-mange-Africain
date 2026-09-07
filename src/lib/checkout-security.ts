import { createHash } from "node:crypto";

export const CHECKOUT_SERVER_VERIFICATION = "jma_checkout_server_v1";

export type CheckoutDeliveryContact = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
};

export function deliveryContactFingerprint(contact: CheckoutDeliveryContact) {
  const canonicalContact = {
    firstName: contact.firstName.trim(),
    lastName: contact.lastName.trim(),
    email: contact.email.trim().toLowerCase(),
    phone: contact.phone.trim(),
    street: contact.street.trim(),
    postalCode: contact.postalCode.trim().toUpperCase(),
    city: contact.city.trim(),
    country: contact.country.trim(),
  };
  return createHash("sha256").update(JSON.stringify(canonicalContact)).digest("hex").slice(0, 16);
}

export function isVerifiedCheckoutPaymentIntent(metadata: Record<string, string> | null | undefined) {
  return metadata?.server_verification === CHECKOUT_SERVER_VERIFICATION;
}
