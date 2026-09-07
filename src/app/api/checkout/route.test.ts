import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  authorizeCustomerRequest: vi.fn(),
  enforceRateLimit: vi.fn(),
  priceCheckout: vi.fn(),
  paymentFindUnique: vi.fn(),
  userFindUnique: vi.fn(),
  customerFindUnique: vi.fn(),
  customerCreate: vi.fn(),
  carrierFindFirst: vi.fn(),
  dbTransaction: vi.fn(),
  txPaymentFindUnique: vi.fn(),
  txPaymentCreate: vi.fn(),
  txProductFindUnique: vi.fn(),
  txProductUpdate: vi.fn(),
  txOrderCreate: vi.fn(),
  txInventoryBatchFindMany: vi.fn(),
  txInventoryBatchUpdate: vi.fn(),
  txStockMovementCreate: vi.fn(),
  txOrderBatchAllocationCreate: vi.fn(),
  txPromotionUpdate: vi.fn(),
  txShipmentCreate: vi.fn(),
  txAuditLogCreate: vi.fn(),
  retrieveIntent: vi.fn(),
  createRefund: vi.fn(),
}));

vi.mock("@/lib/customer-auth", () => ({ authorizeCustomerRequest: mocks.authorizeCustomerRequest }));
vi.mock("@/lib/redis", () => ({ enforceRateLimit: mocks.enforceRateLimit }));
vi.mock("@/lib/push-server", () => ({ sendPushToSubscriptionId: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    payment: { findUnique: mocks.paymentFindUnique },
    user: { findUnique: mocks.userFindUnique },
    customer: { findUnique: mocks.customerFindUnique, create: mocks.customerCreate },
    carrier: { findFirst: mocks.carrierFindFirst },
    $transaction: mocks.dbTransaction,
  },
}));
vi.mock("@/lib/stripe", () => ({
  stripe: {
    paymentIntents: { retrieve: mocks.retrieveIntent },
    refunds: { create: mocks.createRefund },
  },
  stripeConfigurationError: () => "Stripe unavailable",
}));
vi.mock("@/lib/checkout-pricing", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/checkout-pricing")>();
  return { ...actual, priceCheckout: mocks.priceCheckout };
});

import { CheckoutPricingError } from "@/lib/checkout-pricing";
import { CHECKOUT_SERVER_VERIFICATION, deliveryContactFingerprint } from "@/lib/checkout-security";
import { POST } from "./route";

const session = { id: "customer-auth-1", email: "awa@example.fr" };
const paymentIntent = {
  id: "pi_checkout_42",
  status: "succeeded",
  amount_received: 4200,
  currency: "eur",
  metadata: {
    server_verification: CHECKOUT_SERVER_VERIFICATION,
    customer_auth_id: session.id,
    risk_score: "0",
    risk_level: "low",
    risk_requires_review: "false",
  },
  payment_method_types: ["card"],
  payment_method: null,
  latest_charge: null,
};
const body = {
  items: [{ productId: "product-1", variantId: "variant-800", qty: 1 }],
  address: {
    firstName: "Awa",
    lastName: "Traoré",
    email: session.email,
    street: "12 rue des Cultures",
    postalCode: "75011",
    city: "Paris",
    country: "France",
    phone: "+33612345678",
  },
  deliverySlot: "standard",
  paymentIntentId: paymentIntent.id,
  coupon: null,
  locale: "fr",
};

const request = () => new NextRequest("http://localhost/api/checkout", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

describe("POST /api/checkout payment recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authorizeCustomerRequest.mockResolvedValue(session);
    mocks.enforceRateLimit.mockResolvedValue(null);
    mocks.retrieveIntent.mockResolvedValue(paymentIntent);
    mocks.paymentFindUnique.mockResolvedValue(null);
    mocks.createRefund.mockResolvedValue({ id: "re_checkout_42", status: "pending" });
    mocks.userFindUnique.mockResolvedValue({ id: "user-1", email: session.email, role: "customer", isActive: true });
    mocks.customerFindUnique.mockResolvedValue({ id: "customer-1", userId: "user-1" });
    mocks.customerCreate.mockResolvedValue({ id: "customer-1", userId: "user-1" });
    mocks.carrierFindFirst.mockResolvedValue({ id: "carrier-1", name: "DPD Europe", rating: 4.8 });
    mocks.txPaymentFindUnique.mockResolvedValue(null);
    mocks.txPaymentCreate.mockResolvedValue({});
    mocks.txProductFindUnique.mockResolvedValue({ id: "product-1", stockQty: 10, reservedQty: 0 });
    mocks.txProductUpdate.mockResolvedValue({});
    mocks.txOrderCreate.mockResolvedValue({ id: "order-1", number: "JMA-2026-BATCH", total: 42, status: "paymentConfirmed" });
    mocks.txInventoryBatchFindMany.mockResolvedValue([{ id: "batch-1", quantity: 10, reserved: 0, warehouseId: "warehouse-1", costPrice: 12 }]);
    mocks.txInventoryBatchUpdate.mockResolvedValue({});
    mocks.txStockMovementCreate.mockResolvedValue({});
    mocks.txOrderBatchAllocationCreate.mockResolvedValue({});
    mocks.txPromotionUpdate.mockResolvedValue({});
    mocks.txShipmentCreate.mockResolvedValue({});
    mocks.txAuditLogCreate.mockResolvedValue({});
    mocks.dbTransaction.mockImplementation(async (callback) => callback({
      payment: { findUnique: mocks.txPaymentFindUnique, create: mocks.txPaymentCreate },
      product: { findUnique: mocks.txProductFindUnique, update: mocks.txProductUpdate },
      order: { create: mocks.txOrderCreate },
      inventoryBatch: { findMany: mocks.txInventoryBatchFindMany, update: mocks.txInventoryBatchUpdate },
      stockMovement: { create: mocks.txStockMovementCreate },
      orderBatchAllocation: { create: mocks.txOrderBatchAllocationCreate },
      promotion: { update: mocks.txPromotionUpdate },
      shipment: { create: mocks.txShipmentCreate },
      auditLog: { create: mocks.txAuditLogCreate },
    }));
  });

  it("returns an existing order before repricing an idempotent retry", async () => {
    mocks.paymentFindUnique.mockResolvedValue({
      order: { id: "order-42", number: "JMA-2026-0042", total: 42, status: "paymentConfirmed" },
    });

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ order: { id: "order-42" } });
    expect(mocks.priceCheckout).not.toHaveBeenCalled();
    expect(mocks.createRefund).not.toHaveBeenCalled();
  });

  it("starts one idempotent refund when stock changed after payment", async () => {
    mocks.priceCheckout.mockRejectedValue(new CheckoutPricingError("Le stock disponible a changé.", 409));

    const response = await POST(request());
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toMatchObject({
      paymentRecovery: { status: "refund_submitted", reference: "re_checkout_42", refundStatus: "pending" },
    });
    expect(mocks.createRefund).toHaveBeenCalledWith({
      payment_intent: paymentIntent.id,
      metadata: { source: "checkout_recovery", cause: "order_not_created" },
    }, { idempotencyKey: `jma:checkout-recovery:${paymentIntent.id}` });
  });

  it("keeps the payment in reconciliation when database state is ambiguous", async () => {
    mocks.paymentFindUnique.mockRejectedValue(new Error("database unavailable"));

    const response = await POST(request());
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload).toMatchObject({ paymentRecovery: { status: "finalization_pending", reference: paymentIntent.id } });
    expect(mocks.createRefund).not.toHaveBeenCalled();
  });

  it("does not refund when the concurrent-order verification fails", async () => {
    mocks.paymentFindUnique.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error("database unavailable"));
    mocks.priceCheckout.mockRejectedValue(new CheckoutPricingError("Le stock disponible a changé.", 409));

    const response = await POST(request());
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload).toMatchObject({ paymentRecovery: { status: "finalization_pending", reference: paymentIntent.id } });
    expect(mocks.createRefund).not.toHaveBeenCalled();
  });

  it("rejects an unconfirmed payment before repricing or touching order state", async () => {
    mocks.retrieveIntent.mockResolvedValue({ ...paymentIntent, status: "requires_payment_method", amount_received: 0 });

    const response = await POST(request());
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toMatchObject({ error: "Le paiement n'est pas encore confirmé." });
    expect(mocks.paymentFindUnique).not.toHaveBeenCalled();
    expect(mocks.priceCheckout).not.toHaveBeenCalled();
    expect(mocks.createRefund).not.toHaveBeenCalled();
  });

  it("never refunds a payment owned by another customer session", async () => {
    mocks.retrieveIntent.mockResolvedValue({ ...paymentIntent, metadata: { customer_auth_id: "another-customer" } });

    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(mocks.paymentFindUnique).not.toHaveBeenCalled();
    expect(mocks.createRefund).not.toHaveBeenCalled();
  });

  it("rejects a payment intent that was not prepared by server verification", async () => {
    mocks.retrieveIntent.mockResolvedValue({ ...paymentIntent, metadata: { customer_auth_id: session.id } });

    const response = await POST(request());
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({ securityReviewRequired: true });
    expect(mocks.paymentFindUnique).not.toHaveBeenCalled();
    expect(mocks.createRefund).not.toHaveBeenCalled();
  });

  it("refunds a captured payment when the Stripe amount no longer matches the server basket", async () => {
    mocks.retrieveIntent.mockResolvedValue({
      ...paymentIntent,
      amount_received: 4100,
      metadata: {
        ...paymentIntent.metadata,
        cart_fingerprint: "cart-fingerprint",
        delivery_service: "standard",
        address_fingerprint: deliveryContactFingerprint(body.address),
      },
    });
    mocks.priceCheckout.mockResolvedValue({
      validatedItems: [{ productId: "product-1", qty: 1, unitsPerPack: 1, salesChannel: "retail" }],
      total: 42,
      subtotal: 35,
      promoDiscount: 0,
      shipping: 7,
      vat: 6,
      weightGrams: 1_200,
      thermalClasses: ["AMBIANT"],
      shippingQuote: { carrier: "DPD Europe", service: "standard", minDelayHours: 48, maxDelayHours: 72 },
      fingerprint: "cart-fingerprint",
      promotionId: null,
    });

    const response = await POST(request());
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toMatchObject({ paymentRecovery: { status: "refund_submitted", reference: "re_checkout_42" } });
    expect(mocks.createRefund).toHaveBeenCalledWith({
      payment_intent: paymentIntent.id,
      metadata: { source: "checkout_recovery", cause: "order_not_created" },
    }, { idempotencyKey: `jma:checkout-recovery:${paymentIntent.id}` });
  });

  it("refunds a captured payment when active batches cannot cover the stock reservation", async () => {
    mocks.retrieveIntent.mockResolvedValue({
      ...paymentIntent,
      metadata: {
        ...paymentIntent.metadata,
        cart_fingerprint: "traceable-cart",
        delivery_service: "standard",
        address_fingerprint: deliveryContactFingerprint(body.address),
      },
    });
    mocks.priceCheckout.mockResolvedValue({
      validatedItems: [{
        productId: "product-1",
        variantId: null,
        variantLabel: null,
        nameFr: "Attiéké premium",
        nameEn: "Premium attieke",
        sku: "ATT-PREMIUM",
        unitPrice: 35,
        qty: 1,
        lineTotal: 35,
        thermalClass: "AMBIANT",
        imageUrl: null,
        recipeId: null,
        recipeNameFr: null,
        recipeNameEn: null,
        packWeightGrams: 1_200,
        salesChannel: "retail",
        unitsPerPack: 4,
      }],
      total: 42,
      subtotal: 35,
      promoDiscount: 0,
      shipping: 7,
      vat: 6,
      weightGrams: 1_200,
      thermalClasses: ["AMBIANT"],
      shippingQuote: { carrier: "DPD Europe", service: "standard", minDelayHours: 48, maxDelayHours: 72 },
      fingerprint: "traceable-cart",
      promotionId: null,
    });
    mocks.txProductFindUnique.mockResolvedValue({ id: "product-1", stockQty: 4, reservedQty: 0 });
    mocks.txInventoryBatchFindMany.mockResolvedValue([{ id: "batch-1", quantity: 2, reserved: 0, warehouseId: "warehouse-1", costPrice: 12 }]);

    const response = await POST(request());
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toMatchObject({ paymentRecovery: { status: "refund_submitted", reference: "re_checkout_42" } });
    expect(mocks.txProductUpdate).not.toHaveBeenCalled();
    expect(mocks.txPaymentCreate).not.toHaveBeenCalled();
    expect(mocks.txOrderBatchAllocationCreate).not.toHaveBeenCalled();
    expect(mocks.createRefund).toHaveBeenCalledWith({
      payment_intent: paymentIntent.id,
      metadata: { source: "checkout_recovery", cause: "order_not_created" },
    }, { idempotencyKey: `jma:checkout-recovery:${paymentIntent.id}` });
  });

  it("refunds a captured payment when server-side fraud verification blocks finalization", async () => {
    mocks.retrieveIntent.mockResolvedValue({
      ...paymentIntent,
      metadata: {
        ...paymentIntent.metadata,
        cart_fingerprint: "risky-cart",
        delivery_service: "standard",
        address_fingerprint: deliveryContactFingerprint(body.address),
        risk_score: "72",
        risk_level: "high",
        risk_requires_review: "true",
      },
    });
    mocks.priceCheckout.mockResolvedValue({
      validatedItems: [{ productId: "product-1", qty: 40, unitsPerPack: 1, salesChannel: "retail" }],
      total: 42,
      subtotal: 35,
      promoDiscount: 0,
      shipping: 7,
      vat: 6,
      weightGrams: 1_200,
      thermalClasses: ["AMBIANT"],
      shippingQuote: { carrier: "DPD Europe", service: "standard", minDelayHours: 48, maxDelayHours: 72 },
      fingerprint: "risky-cart",
      promotionId: null,
    });

    const response = await POST(request());
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toMatchObject({ paymentRecovery: { status: "refund_submitted", reference: "re_checkout_42" } });
    expect(mocks.createRefund).toHaveBeenCalledWith({
      payment_intent: paymentIntent.id,
      metadata: { source: "checkout_recovery", cause: "order_not_created" },
    }, { idempotencyKey: `jma:checkout-recovery:${paymentIntent.id}` });
  });
});
