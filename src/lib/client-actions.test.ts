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
  weightGrams: 1_500,
  packageCount: 1,
  shipments: [{
    carrierName: "Chrono Frais",
    trackingNumber: "JMA-FR-0042",
    thermalClass: "REFRIGERATED",
    status: "in_transit",
    estimatedDelivery: "2026-09-04T14:00:00.000Z",
  }],
};

describe("customer invoice document", () => {
  it("renders the brand, delivery identity, product image and transaction references", () => {
    const html = buildOrderInvoiceHtml(order, "fr", {
      baseUrl: "https://je-mange-africain.com",
      company: {
        name: "Je mange Africain SAS",
        address: "8 rue des Saveurs, 75001 Paris, France",
        legalFormCapital: "SAS au capital de 10 000 EUR",
        registration: "RCS TEST 123",
        vat: "FR00123456789",
        earlyPaymentTerms: "Pas d'escompte pour paiement anticipé.",
        latePaymentTerms: "Pénalités exigibles selon les conditions contractuelles.",
        collectionFee: "40 EUR pour les clients professionnels.",
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
    expect(html).toContain("SAS au capital de 10 000 EUR");
    expect(html).toContain("data-company-profile=\"complete\"");
    expect(html).toContain("Prix unit. HT");
    expect(html).toContain("TVA incluse");
    expect(html).toContain("Livraison de biens");
    expect(html).toContain("Chrono Frais");
    expect(html).toContain("JMA-FR-0042");
    expect(html).toContain("Réfrigéré");
    expect(html).toContain("04 septembre 2026");
    expect(html).toContain("1,5 kg");
    expect(html).toContain("Imprimer / PDF");
    expect(html).toContain("@media(max-width:660px)");
    expect(html).not.toContain("nth-child(3),td:nth-child(3){display:none}");
    expect(html).not.toContain("background:#000");
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
    expect(html).not.toContain("javascript:alert");
  });

  it("uses a readable delivery service label when the order stores a service code", () => {
    const html = buildOrderInvoiceHtml({ ...order, deliverySlot: "express" }, "fr", {
      baseUrl: "https://je-mange-africain.com",
    });

    expect(html).toContain("Livraison express");
  });

  it("uses stable invoice metadata and readable payment labels when supplied", () => {
    const html = buildOrderInvoiceHtml({
      ...order,
      invoiceNumber: "FAC-2026-0042",
      invoicedAt: "2026-09-03T09:30:00.000Z",
      payments: [{ method: "apple_pay", status: "paid", reference: "pay_0042", createdAt: "2026-09-03T09:29:00.000Z" }],
    }, "fr", { baseUrl: "https://je-mange-africain.com" });

    expect(html).toContain("FAC-2026-0042");
    expect(html).toContain("03 septembre 2026");
    expect(html).toContain("Apple Pay");
    expect(html).toContain("Réglée le 03 septembre 2026");
  });
});
