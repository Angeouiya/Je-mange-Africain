import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CheckoutSecurityReviewNotice } from "./CheckoutSecurityReviewNotice";

describe("CheckoutSecurityReviewNotice", () => {
  it("explains in French that no payment or order was completed", () => {
    const html = renderToStaticMarkup(createElement(CheckoutSecurityReviewNotice, {
      locale: "fr",
      message: "Vérification serveur requise.",
      onEditDelivery: () => undefined,
      onReviewCart: () => undefined,
    }));

    expect(html).toContain("Paiement non lancé");
    expect(html).toContain("commande non validée");
    expect(html).toContain("Vérification serveur requise.");
    expect(html).toContain("Revoir le panier");
  });

  it("keeps the English copy explicit and non-floating", () => {
    const html = renderToStaticMarkup(createElement(CheckoutSecurityReviewNotice, {
      locale: "en",
    }));

    expect(html).toContain("Payment not started");
    expect(html).toContain("order not confirmed");
    expect(html).toContain("data-testid=\"checkout-security-review\"");
  });
});
