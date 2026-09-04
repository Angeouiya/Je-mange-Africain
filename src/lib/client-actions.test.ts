import { describe, expect, it } from "vitest";
import { buildOrderInvoiceHtml } from "./client-actions";

const order = {
  number: "JMA-260902-0042",
  createdAt: "2026-09-02T10:00:00.000Z",
  currency: "GBP",
  subtotal: 18,
  shippingCost: 4,
  vatAmount: 3.67,
  total: 22,
  deliveryName: "Aminata Koné",
  deliveryAddress: "12 rue des Cultures",
  deliveryPostalCode: "75011",
  deliveryCity: "Paris",
  deliveryCountry: "France",
  customerEmail: "aminata@example.fr",
  customerPhone: "+33 6 00 00 00 00",
  deliverySlot: "Mercredi, 14 h - 18 h",
  items: [{
    nameFr: "Attiéké frais",
    nameEn: "Fresh attieke",
    sku: "JMA-ATT-500",
    qty: 2,
    unitPrice: 9,
    lineTotal: 18,
    imageUrl: "/products/attieke.webp",
  }],
  payments: [{ method: "Carte", status: "captured", reference: "pi_0042" }],
};

describe("customer invoice document", () => {
  it("renders the brand, delivery identity, product image and transaction references", () => {
    const html = buildOrderInvoiceHtml(order, "fr", {
      baseUrl: "https://je-mange-africain.com",
      company: {
        name: "Je mange Africain SAS",
        registration: "RCS TEST 123",
        vat: "FR00123456789",
      },
    });

    expect(html).toContain("https://je-mange-africain.com/brand/logo-mark-burgundy.png");
    expect(html).toContain("https://je-mange-africain.com/products/attieke.webp");
    expect(html).toContain("Aminata Koné");
    expect(html).toContain("aminata@example.fr");
    expect(html).toContain("pi_0042");
    expect(html).toContain("Payée");
    expect(html).toContain("GBP");
    expect(html).toContain("FR00123456789");
    expect(html).toContain("th{background:#8A3042");
    expect(html).not.toContain("background:#3F2930");
  });

  it("escapes customer and product content before inserting it into the document", () => {
    const html = buildOrderInvoiceHtml({
      ...order,
      deliveryName: '<script>alert("client")</script>',
      items: [{ ...order.items[0], nameEn: "Plantain <premium>" }],
    }, "en", { baseUrl: "https://je-mange-africain.com" });

    expect(html).not.toContain('<script>alert("client")</script>');
    expect(html).toContain("&lt;script&gt;alert(&quot;client&quot;)&lt;/script&gt;");
    expect(html).toContain("Plantain &lt;premium&gt;");
  });

  it("uses a readable delivery service label when the order stores a service code", () => {
    const html = buildOrderInvoiceHtml({ ...order, deliverySlot: "express" }, "fr", {
      baseUrl: "https://je-mange-africain.com",
    });

    expect(html).toContain("Livraison express");
  });
});
